/**
 * POST /api/v1/voice/transcribe — Sarvam speech-to-text, for the web build.
 *
 * ★ JSON in, not multipart. The phone sends a multipart body because React
 *   Native's `FormData` can stream a file off disk by uri. A browser has no
 *   such uri — it has a `Blob` — and parsing multipart inside a serverless
 *   function means adding a body parser for no gain. So the web client sends
 *   `{ audio_base64, mime_type, locale }` and this function rebuilds the file
 *   on the way upstream, where Sarvam does want multipart.
 *
 * ★ **The language bug this fixes.** A farmer who has chosen Marathi says his
 *   phone number in Marathi, and the transcript came back as English words or
 *   as nothing usable, so the field stayed empty and the mic looked broken.
 *   The cause is the `language_code` Sarvam is told: with the wrong one — or
 *   with none — the recogniser decodes Marathi speech against the wrong
 *   acoustic model. The locale the farmer picked is now passed through on
 *   every request, and the code Sarvam actually used comes back on the
 *   response so a mismatch is visible instead of silent.
 *
 * ★ Keys come from `SARVAM_API_KEYS` (comma-separated) and rotate on the
 *   statuses that mean "this key", exactly as `narrate.ts` does.
 */

const STT_ENDPOINT = 'https://api.sarvam.ai/speech-to-text';

/** `saaras:v3` is what the FastAPI backend runs (`SARVAM_ASR_MODEL`). */
const MODEL = 'saaras:v3';

const LANGUAGE_CODE: Record<string, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

/**
 * ★ Body size. A Vercel function accepts up to about 4.5 MB of request body,
 *   and that is a platform limit, not a setting this file can raise. Browser
 *   opus runs roughly 12 KB per second, so the onboarding clips — a phone
 *   number, an OTP, a village name — are tens of kilobytes. A recording long
 *   enough to hit the cap would be several minutes of someone talking, which
 *   is not a case this screen has.
 */

function keyPool(): string[] {
  const raw = process.env.SARVAM_API_KEYS ?? process.env.SARVAM_API_KEY ?? '';
  return raw
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
}

function isKeyProblem(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429;
}

/** The extension Sarvam infers the container from. */
function fileNameFor(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'clip.m4a';
  if (mime.includes('ogg')) return 'clip.ogg';
  if (mime.includes('wav')) return 'clip.wav';
  return 'clip.webm';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const audioBase64: unknown = body?.audio_base64;
  const mimeType: string = typeof body?.mime_type === 'string' ? body.mime_type : 'audio/webm';
  const locale: string = typeof body?.locale === 'string' ? body.locale : 'mr';

  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'audio_base64 is required', field: 'audio_base64' },
    });
  }

  const keys = keyPool();
  if (keys.length === 0) {
    return res.status(503).json({
      error: {
        code: 'NO_VOICE_KEY',
        message: 'SARVAM_API_KEYS is not set on this deployment; type the value instead.',
      },
    });
  }

  const language_code = LANGUAGE_CODE[locale] ?? LANGUAGE_CODE.mr!;
  const bytes = Buffer.from(audioBase64, 'base64');

  let lastStatus = 502;
  let lastMessage = 'no Sarvam key succeeded';

  for (const key of keys) {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), fileNameFor(mimeType));
    form.append('model', MODEL);
    form.append('language_code', language_code);

    let upstream: Response;
    try {
      upstream = await fetch(STT_ENDPOINT, {
        method: 'POST',
        headers: { 'api-subscription-key': key },
        body: form,
      });
    } catch (err) {
      lastStatus = 502;
      lastMessage = `could not reach Sarvam: ${(err as Error).message}`;
      continue;
    }

    if (isKeyProblem(upstream.status)) {
      lastStatus = upstream.status;
      lastMessage = `key rejected (HTTP ${upstream.status})`;
      continue;
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return res.status(502).json({
        error: { code: 'UPSTREAM', message: `Sarvam HTTP ${upstream.status}: ${detail.slice(0, 200)}` },
      });
    }

    const data = (await upstream.json().catch(() => null)) as
      | { transcript?: string; language_code?: string; request_id?: string }
      | null;

    return res.status(200).json({
      transcript: data?.transcript ?? '',
      // What Sarvam says it heard it in — not what we asked for. When these
      // two disagree, that is the whole diagnosis for "it does not
      // understand me in Marathi".
      language_code: data?.language_code ?? language_code,
      requested_language_code: language_code,
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
