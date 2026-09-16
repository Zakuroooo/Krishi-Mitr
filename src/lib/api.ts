/**
 * The only place in the app that calls `fetch`. Everything else goes through
 * TanStack Query, which calls the helpers at the bottom of this file.
 *
 * One place, because:
 *  - the Authorization header is attached in exactly one spot, so it cannot be
 *    forgotten on the one screen that matters;
 *  - the error envelope is unwrapped once, so no screen ever reads `err.message`
 *    off a raw `Response`;
 *  - I14 (never log a phone, an OTP, or a full payload) is enforceable by reading
 *    a single function instead of auditing forty call sites.
 *
 * There is no axios. `fetch` is built in and this is 90 lines.
 * There is no camelCase mapping layer. The wire is `snake_case` and we read it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config';
import type {
  ApiErrorBody,
  AssayReq,
  AssayRecord,
  AssayRes,
  AuthRes,
  Commodity,
  DemandDto,
  DisputeDto,
  DisputeReasonCode,
  DisputeRes,
  District,
  EscrowEvent,
  ForecastRes,
  Locale,
  LotDto,
  Market,
  MatchesRes,
  ModelCard,
  NearbyRes,
  OfferDto,
  OtpRequestRes,
  PoolDto,
  PriceSeriesRes,
  ProvenanceRes,
  TxDto,
  TxStatus,
  User,
  WindowRecommendReq,
  WindowRes,
} from '../types/api';

const TOKEN_KEY = 'auth.token';
// ★ Versioned. The cached user survives reinstalls of the JS bundle, so a
//   farmer who signed in before a fixture or shape change keeps the *old*
//   record forever — which is why the app kept greeting "Fixture Farmer" long
//   after that name was changed. Bumping the suffix retires the stale copy.
const USER_KEY = 'auth.user.v2';

/**
 * Phase 1 stores the JWT in AsyncStorage, and we say so out loud rather than
 * implying a keystore we did not build.
 *
 * The honest version, if a judge asks: *"Phase 2 uses react-native-keychain. In
 * Phase 1 it's a 72-hour JWT on a device the farmer owns, and we wrote that down."*
 * A document claiming an encrypted store that the code does not have is the kind of
 * claim that fails the only follow-up question that matters — "show me".
 */
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

/**
 * The last signed-in user, cached beside the token.
 *
 * ★ Why cache the user at all when `GET /auth/me` exists: because that call
 *   needs a network, and a cold start without one used to drop the farmer at
 *   the language picker — re-entering phone, OTP, name and district every
 *   time. A 72-hour token that the device already holds is enough to know who
 *   he is; the server still re-derives the actor on every read (I4), so this
 *   cache is a convenience for rendering, never an authorization claim.
 */
export async function getCachedUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // A corrupt cache is not worth a crash on launch — treat it as absent.
    return null;
  }
}

export async function setCachedUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Carries the server's error `code`, not just a message.
 *
 * Screens branch on `code`, never on the message string — the message is Marathi
 * or English depending on the server's mood and is for humans only.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly field: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // The API always returns {error:{code,message,field}} — but a 502 comes from
    // nginx, not from us, and its body is HTML. Never assume the envelope.
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? 'NETWORK',
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      body?.error?.field ?? null,
    );
  }

  // 204 has no body. Auth logout is the only one today, but the next one will not
  // announce itself.
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

const post = <T,>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

const get = <T,>(path: string): Promise<T> => request<T>(path);

/**
 * Generic escape hatch, exported so `S24_DataProvenance.tsx` (Shreya's screen,
 * not touched here per this task's explicit instruction) compiles against its
 * own `api<T>(path)` import. New code should prefer a named function below —
 * `getDataProvenance()` is the one S24 should really be calling.
 */
export const api = get;

// ─────────────────────────────────────────────────────────────────────────────
// Auth — §7.1
//
// ★ I14. Nothing in this section logs. Not the phone, not the code, not the body.
//   If you add a console.log while debugging OTP, delete it in the same commit —
//   a phone number in a log that ships is a real disclosure, not a style nit.
// ─────────────────────────────────────────────────────────────────────────────

export const requestOtp = (phone: string) =>
  post<OtpRequestRes>('/auth/otp/request', { phone });

export const verifyOtp = (phone: string, code: string) =>
  post<AuthRes>('/auth/otp/verify', { phone, code });

/**
 * ★ CONTRACT GAP, blocker filed: CANON §7.1 documents this body as `{phone, code,
 *   name, role, locale, district_id}` — no `village` — but CANON §6.2's `farmers`
 *   table has a nullable `village` column, and PRANAY.md's S3 spec ("Name,
 *   district, village") requires collecting it. `village` is sent as an optional
 *   extra field: harmless if Akash's A1 ignores it today, and the field the DB
 *   already has room for once he doesn't.
 */
export const register = (body: {
  phone: string;
  code: string;
  name: string;
  role: 'FARMER' | 'BUYER';
  locale: Locale;
  district_id: string;
  village?: string;
}) => post<AuthRes>('/auth/register', body);

export const getMe = () => get<{ user: User }>('/auth/me');

// ─────────────────────────────────────────────────────────────────────────────
// Reference — §7.2. Kartik's K5 does not exist yet — S3 reads `fixtures/auth.ts`
// (`fxDistricts`) until it does.
// ─────────────────────────────────────────────────────────────────────────────

export const getDistricts = () => get<District[]>('/ref/districts');

/** CANON §7.2. The market picker needs these: a district on its own does not
 * identify a price series — `/prices/series` is keyed by mandi. */
export const getMarkets = (districtId: string) =>
  get<Market[]>(`/ref/markets?district_id=${districtId}`);

export const getCommodities = () => get<Commodity[]>('/ref/commodities');

// ─────────────────────────────────────────────────────────────────────────────
// Prices — §7.3
// ─────────────────────────────────────────────────────────────────────────────

export const getPriceSeries = (commodityId: string, marketId: string, days = 180) =>
  get<PriceSeriesRes>(
    `/prices/series?commodity_id=${commodityId}&market_id=${marketId}&days=${days}`,
  );

/** Sorted by NET, descending. The ordering is the product; do not re-sort it here. */
export const getNearbyMarkets = (commodityId: string, districtId: string) =>
  get<NearbyRes>(
    `/prices/nearby?commodity_id=${commodityId}&district_id=${districtId}`,
  );

// ─────────────────────────────────────────────────────────────────────────────
// AI — §7.4
// ─────────────────────────────────────────────────────────────────────────────

export const getForecast = (commodityId: string, marketId: string, horizon = 14) =>
  get<ForecastRes>(
    `/ai/forecast?commodity_id=${commodityId}&market_id=${marketId}&horizon=${horizon}`,
  );

export const getModelCard = (commodityId: string) =>
  get<ModelCard>(`/ai/model-card?commodity_id=${commodityId}`);

/**
 * ★ THE HERO.
 *
 * Note the path is `/ai/window/recommend`, per CANON §7.4. `CLAUDE.md` §1 writes it
 * as `/window/recommend` without the `/ai` — CANON wins, blocker filed.
 *
 * `NO_ADVICE` arrives as a **200 with a body**, not an error. It must not be thrown,
 * must not route through `ErrorState`, and must not offer a retry button. A refusal
 * that looks like a crash reads as a bug; a refusal that looks deliberate reads as
 * integrity, and that is the whole point of I6.
 */
export const recommendWindow = (body: WindowRecommendReq) =>
  post<WindowRes>('/ai/window/recommend', body);

// ─────────────────────────────────────────────────────────────────────────────
// Lots, grading, pools — §7.5. Akash's routes do not exist in this repo; these
// are thin clients against the shapes proposed in
// docs/handover/FRONTEND_NEEDS_BACKEND.md §5, gated behind USE_FIXTURES.
// ─────────────────────────────────────────────────────────────────────────────

export const createLot = (body: {
  commodity_id: string;
  market_id: string;
  qty_kg: number;
  harvest_date: string | null;
  photo_path?: string;
}) => post<LotDto>('/lots', body);

/** Actor-scoped (I4) — the server reads the farmer off the JWT, not a param. */
export const getLots = () => get<LotDto[]>('/lots');

/** 404, not 403, for a lot the actor does not own (I4). */
export const getLot = (id: string) => get<LotDto>(`/lots/${id}`);

export const submitAssay = (lotId: string, body: AssayReq) =>
  post<AssayRes>(`/lots/${lotId}/assay`, body);

/**
 * The six stored answers behind a grade, for S20.
 *
 * TODO(akash): this route does **not** exist in CANON §7.5 — `POST .../assay`
 *   returns only the score/grade/tip and discards the answers, and no endpoint
 *   reads the `grade_assays` row back. The columns are already in the DDL
 *   (CANON §6.4), so this is an exposure, not a new feature. Fold it into
 *   `GET /lots/{id}` instead and I will delete this. Raised in docs/BLOCKERS.md.
 */
export const getLotAssay = (lotId: string) =>
  get<AssayRecord>(`/lots/${lotId}/assay`);

export const getPool = (id: string) => get<PoolDto>(`/pools/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// Demands, matching, offers — §7.6
// ─────────────────────────────────────────────────────────────────────────────

export const getDemands = () => get<DemandDto[]>('/demands');

/** ★ CANON §7.6 — ranked, and includes multi-lot combinations. S19 reads this. */
export const getMatches = (demandId: string) =>
  get<MatchesRes>(`/demands/${demandId}/matches`);

export const getOffers = () => get<OfferDto[]>('/offers');

export const createOffer = (body: {
  demand_id?: string;
  lot_ids: string[];
  qty_kg: number;
  price_paise_per_qtl: number;
}) => post<OfferDto>('/offers', body);

export const acceptOffer = (offerId: string) => post<TxDto>(`/offers/${offerId}/accept`, {});

export const rejectOffer = (offerId: string) => post<OfferDto>(`/offers/${offerId}/reject`, {});

/**
 * S14's action. `round+1`, **409 MAX_ROUNDS past round 3** per
 * FRONTEND_NEEDS_BACKEND.md §6 — S14 disables its own counter button on the
 * third round from `OfferDto.round` rather than waiting to be told by the
 * 409; the status code is the backstop, not the primary path.
 */
/**
 * The full back-and-forth on one negotiation, oldest round first.
 *
 * ★ The backend has had `GET /offers/{id}/thread` all along and the frontend
 *   never called it. That omission is why "chat" looked missing: the
 *   negotiation channel in this product is the offer thread — each round
 *   carries a price and an optional `note`, which is the message — and
 *   without this call there was no way to render a conversation, only the
 *   single latest offer. A separate free-text messenger would have needed an
 *   endpoint that does not exist; this one does.
 */
export const getOfferThread = (offerId: string) =>
  get<OfferDto[]>(`/offers/${offerId}/thread`);

export const counterOffer = (offerId: string, body: { price_paise_per_qtl: number; note?: string }) =>
  post<OfferDto>(`/offers/${offerId}/counter`, body);

// ─────────────────────────────────────────────────────────────────────────────
// Escrow and disputes — §7.7
// ─────────────────────────────────────────────────────────────────────────────

export const getTransaction = (id: string) => get<TxDto>(`/tx/${id}`);

/** Append-only (I5) — the timeline renders from this, never from `TxDto.status`. */
export const getEscrowEvents = (id: string) => get<EscrowEvent[]>(`/tx/${id}/events`);

/**
 * `Idempotency-Key` is required per CANON §7.7 so a double-tap on a bad
 * connection replays instead of 409ing. Generate a stable key per (tx, to_status).
 */
export const transitionTx = (id: string, toStatus: TxStatus, idempotencyKey: string, note?: string) =>
  request<TxDto>(`/tx/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ to_status: toStatus, note }),
    headers: { 'Idempotency-Key': idempotencyKey },
  });

/**
 * CANON §7.7 documents the request body but not the response. We assume the
 * created row, because every other `POST` in the contract returns the row it
 * created, and because a screen that raises a dispute and then cannot show it
 * has to guess at a stage.
 *
 * TODO(akash): confirm this returns `DisputeDto`. Raised in docs/BLOCKERS.md.
 */
export const createDispute = (body: {
  tx_id: string;
  reason_code: DisputeReasonCode;
  description: string;
  photo_path?: string;
}) => post<DisputeDto>('/disputes', body);

/**
 * ★ CONTRACT GAP. This takes a `dispute_id`, and nothing in CANON hands one
 * out: `TxDto` has no `dispute_id`, and there is no `GET /disputes?tx_id=`.
 * So a buyer arriving at S25 on an already-disputed transaction cannot look
 * up his own complaint — the screen says so rather than inventing a route.
 *
 * TODO(akash): either `dispute_id` on `TxDto` or `GET /disputes?tx_id=`.
 * Raised in docs/BLOCKERS.md.
 */
export const getDispute = (id: string) => get<DisputeRes>(`/disputes/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// Meta and provenance — §7.8. Unblocks S24_DataProvenance.
// ─────────────────────────────────────────────────────────────────────────────

export const getDataProvenance = () => get<ProvenanceRes>('/meta/data-provenance');

// ─────────────────────────────────────────────────────────────────────────────
// Voice — PROPOSED, same status as the chat section above: no CANON section
// defines these, and neither route exists on the server yet (`voice.py`'s
// router is an empty `APIRouter()`, `voice_engine.py` raises
// `NotImplementedError` — per the backend-side handoff this was built
// against). Wired here anyway, ahead of the backend, so the mic UI in S2/S3
// has something real to call the moment the route lands — until then this
// throws `ApiError('NETWORK', ...)` the same way any other unreachable
// endpoint does, and the caller's existing error handling covers it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uploads a recorded clip for transcription. Not `post()` — that helper
 * always sends `Content-Type: application/json`, which is wrong for a
 * multipart body (and would stop `fetch` from setting its own boundary).
 */
export async function transcribeAudio(audioUri: string, locale: Locale): Promise<{ transcript: string }> {
  const token = await getToken();
  const form = new FormData();
  // React Native's `FormData` accepts this `{uri, type, name}` shape in
  // place of a real `Blob` — it reads the file at `uri` off disk at send
  // time. `audioUri` is whatever `VoiceMic`'s recorder handed back.
  form.append('audio', {
    uri: audioUri,
    type: 'audio/mp4',
    name: 'clip.m4a',
  } as unknown as Blob);
  form.append('locale', locale);

  const res = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // No Content-Type here — `fetch` sets `multipart/form-data` with the
      // correct boundary itself only when it is left to do so.
    },
    body: form,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? 'NETWORK',
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      body?.error?.field ?? null,
    );
  }
  return (await res.json()) as { transcript: string };
}

/**
 * Live TTS — Sarvam `bulbul:v3`, via the backend's `/voice/narrate`.
 *
 * The sale-window voice agent (S9) prefers this human-grade Marathi audio
 * over the device's own TTS: the verdict sentence carries a lot, dates and
 * amounts, so it cannot be a pre-recorded clip and has to be synthesized on
 * demand. `lib/voice.ts`'s `speakSaleWindow()` falls back to on-device
 * `speakText()` whenever this is unreachable, so a network or server problem
 * never silences the verdict — it only downgrades the voice.
 *
 * ★ This was typed `{ audio_url: string }` here and would have failed the
 *   moment anything called it; the route returns base64. Corrected against
 *   the live contract, and against the backend team's own `NarrateRes`.
 *
 * ★ The route is deliberately unauthenticated on the server — it runs before
 *   a JWT exists during voice registration.
 */
/**
 * ★ Shape adopted from the backend team's own `NarrateRes` (Nikhil's
 *   `feat(voice)` commit) rather than the inline type this file had — theirs
 *   also carries `request_id`, which Sarvam returns and which is the only
 *   handle for chasing a bad synthesis upstream.
 */
export interface NarrateRes {
  audio_base64: string;
  audio_format: string;
  language_code: string;
  request_id?: string | null;
}

/**
 * ★ `speaker` and `pace` are per-request and honoured by the route: the server
 *   falls back to its configured `SARVAM_TTS_SPEAKER` when `speaker` is absent,
 *   so older callers keep their voice. Speaker ids must come from the roster of
 *   whichever `bulbul` model the server is on — v3 rejects v2's names outright.
 *   See `SARVAM_SPEAKER` in `lib/voiceSettings.ts`.
 */
export const narrate = (text: string, locale: Locale, speaker?: string, pace?: number) =>
  post<NarrateRes>('/voice/narrate', { text, locale, ...(speaker ? { speaker } : {}), ...(pace ? { pace } : {}) });
