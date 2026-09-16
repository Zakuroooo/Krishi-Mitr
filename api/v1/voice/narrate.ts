/**
 * POST /api/v1/voice/narrate — Sarvam bulbul:v3, for the web build.
 *
 * ★ Why this exists. On the phone, `lib/voice.ts` calls the FastAPI backend,
 *   which holds the Sarvam keys. The web build has no backend, and putting a
 *   key in the bundle would publish it (I10) — a bundle is a public file, and
 *   "it's only a demo key" is how keys end up on someone else's bill. So the
 *   browser calls this function on the same origin, and the key stays in a
 *   Vercel environment variable that never enters git.
 *
 * ★ The response shape is the backend's `NarrateRes`, field for field, so
 *   `lib/api.ts` is unchanged and the phone and the web speak through the
 *   same client code.
 *
 * ★ Key rotation. `SARVAM_API_KEYS` is a comma-separated pool. A key that
 *   answers 401/402/403/429 is out of credit, revoked, or throttled — none of
 *   which the next key shares — so the request retries down the pool before
 *   giving up. This is the exact failure that silently degraded every voice on
 *   the phone to the robotic fallback for a whole afternoon: one key hit
 *   "402 No credits available" and nothing said so.
 */

const TTS_ENDPOINT = 'https://api.sarvam.ai/text-to-speech';
const MODEL = 'bulbul:v3';

/** The app speaks in three locales; Sarvam wants BCP-47. */
const LANGUAGE_CODE: Record<string, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

/** Matches `SARVAM_TTS_SPEAKER` on the FastAPI side — a v3 roster name. */
const DEFAULT_SPEAKER = 'simran';

/** Sarvam rejects input over 500 characters; the client already chunks to
 *  480, so anything longer than this arrived malformed and is refused here
 *  rather than sent upstream to fail. */
const MAX_CHARS = 500;

function keyPool(): string[] {
  const raw = process.env.SARVAM_API_KEYS ?? process.env.SARVAM_API_KEY ?? '';
  return raw
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
}

/** A response that says "this key, not this request" — try the next key. */
function isKeyProblem(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const text: unknown = body?.text;
  const locale: string = typeof body?.locale === 'string' ? body.locale : 'mr';
  const speaker: string = typeof body?.speaker === 'string' ? body.speaker : DEFAULT_SPEAKER;
  const pace: number | undefined = typeof body?.pace === 'number' ? body.pace : undefined;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION', message: 'text is required', field: 'text' } });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: `text must be ${MAX_CHARS} characters or fewer`, field: 'text' },
    });
  }

  const keys = keyPool();
  if (keys.length === 0) {
    // Said plainly, because the symptom otherwise is "the nice voice stopped
    // working" with a perfectly healthy-looking deployment.
    return res.status(503).json({
      error: {
        code: 'NO_VOICE_KEY',
        message: 'SARVAM_API_KEYS is not set on this deployment; falling back to the device voice.',
      },
    });
  }

  const language_code = LANGUAGE_CODE[locale] ?? LANGUAGE_CODE.mr!;
  const payload: Record<string, unknown> = {
    text,
    target_language_code: language_code,
    speaker,
    model: MODEL,
  };
  if (pace !== undefined) payload.pace = pace;

  let lastStatus = 502;
  let lastMessage = 'no Sarvam key succeeded';

  for (const key of keys) {
    let upstream: Response;
    try {
      upstream = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      lastStatus = 502;
      lastMessage = `could not reach Sarvam: ${(err as Error).message}`;
      continue;
    }

    if (isKeyProblem(upstream.status)) {
      lastStatus = upstream.status;
      lastMessage = `key rejected (HTTP ${upstream.status})`;
      continue; // next key in the pool
    }

    if (!upstream.ok) {
      // Not a key problem — a bad request or an upstream fault. Another key
      // would fail identically, so stop here rather than burning the pool.
      const detail = await upstream.text().catch(() => '');
      return res.status(502).json({
        error: { code: 'UPSTREAM', message: `Sarvam HTTP ${upstream.status}: ${detail.slice(0, 200)}` },
      });
    }

    const data = (await upstream.json().catch(() => null)) as
      | { audios?: string[]; request_id?: string }
      | null;
    const audio = data?.audios?.[0];

    if (!audio) {
      return res
        .status(502)
        .json({ error: { code: 'UPSTREAM', message: 'Sarvam returned no audio' } });
    }

    // Same-origin only; the browser never sees a key either way, but there is
    // no reason for another site to spend this deployment's credits.
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({
      audio_base64: audio,
      audio_format: 'wav',
      // Echoed from what was actually requested, not hardcoded: the phone
      // build once always returned "mr-IN" here, and the app cheerfully read
      // English text in a Marathi voice because of it.
      language_code,
      request_id: data?.request_id ?? null,
    });
  }

  return res.status(lastStatus === 429 ? 429 : 502).json({
    error: { code: 'UPSTREAM', message: lastMessage },
  });
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
