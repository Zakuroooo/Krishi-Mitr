/**
 * Runtime configuration. Committed to git. **No secrets in this file, ever (I10).**
 *
 * The app holds no keys. Auth is a JWT the server issues at runtime and we store
 * on the device. There is nothing in here that would matter if the repo were public
 * tomorrow, and it must stay that way — the moment someone adds a key here it is in
 * the history forever and rotating it becomes somebody's Sunday.
 *
 * There is no `EXPO_PUBLIC_*` and no `.env` in the app. That was an Expo mechanism
 * and we are on React Native CLI. This file is the mechanism.
 */

import type { Grade } from './types/api';

/**
 * ★ How the app reaches the API in development. Three transports; we default to the
 *   first, and the choice is not cosmetic — one of them dies at the venue.
 *
 *   'adb-reverse'  localhost:8000, tunnelled over the **USB cable** by
 *                    adb reverse tcp:8000 tcp:8000
 *                  Works on a physical phone and on an emulator. Involves no wifi
 *                  at all, which is exactly why it is also the demo-day transport.
 *                  ★ Re-run the command every time you replug the phone. If you
 *                    forget, requests hang in a way indistinguishable from the
 *                    server being down.
 *
 *   'emulator'     10.0.2.2:8000 — the Android emulator's built-in alias for the
 *                  host machine. Zero setup, emulator only. Note `localhost`
 *                  inside an emulator IS the emulator; that confusion is the most
 *                  common first-day React Native mistake.
 *
 *   'lan'          LAN_IP:8000, phone and laptop on the same wifi. Last resort.
 *                  Venue wifi fails. It always fails.
 */
type DevTransport = 'adb-reverse' | 'emulator' | 'lan';

// Named, rather than an inline union on the annotation. TypeScript narrows a
// `const` to its literal initializer at every use site, so `typeof DEV_TRANSPORT`
// is `'adb-reverse'` — and `Record<typeof DEV_TRANSPORT, string>` below becomes a
// one-key record that rejects the other two transports.
const DEV_TRANSPORT: DevTransport = 'adb-reverse';

/**
 * Only read when DEV_TRANSPORT is 'lan'. Find it with:
 *
 *     ipconfig getifaddr en0
 *
 * If you change this you must also add it to
 * `android/app/src/main/res/xml/network_security_config.xml`, or Android refuses the
 * cleartext connection and you spend the next hour debugging the wrong layer.
 */
const LAN_IP = '192.168.1.7';

const PROD_HOST = 'http://<ec2-host>'; // TODO(kartik): real host at K9, the H28 deploy rehearsal

const DEV_HOST: Record<DevTransport, string> = {
  'adb-reverse': 'http://localhost:8000',
  emulator: 'http://10.0.2.2:8000',
  lan: `http://${LAN_IP}:8000`,
};

export const API_BASE_URL = __DEV__
  ? `${DEV_HOST[DEV_TRANSPORT]}/api/v1`
  : `${PROD_HOST}/api/v1`;

/**
 * Fallback rung 3 of the demo-day ladder: flip to `true`, rebuild, and every screen
 * renders from `src/fixtures/` with no API at all.
 *
 * Rung 1 is the deployed API. Rung 2 is the API on the laptop over a phone hotspot.
 * Rung 3 is this. It exists because venue wifi fails, and it always fails.
 *
 * ★ Currently `true` for a second reason: `api/` does not exist in this repo yet —
 *   A0/A1 have not landed. Every screen from S1 onward has nothing to talk to.
 *   TODO(pranay): flip back to `false` the moment Akash's A1 is live and reachable
 *   — this is a dev-time necessity right now, not a demo-day setting, and leaving
 *   it `true` past that point means testing against stale fixtures without
 *   noticing the real endpoint drifted.
 *
 * ★ **The flip is one line, and that has been checked rather than assumed**
 *   (2026-09-07). Setting this to `false` compiles with zero TypeScript
 *   errors: all 33 screens that branch on it call a real `lib/api` function
 *   on the other side, including the two reference endpoints that had no
 *   caller at all until the market pickers needed them (`getMarkets`,
 *   `getCommodities`). Nothing is stubbed behind a `throw` or a `null` that
 *   would only surface at runtime.
 *
 *   What that does *not* prove is that the responses match. The fixtures are
 *   CANON-shaped by construction and the app reads `snake_case` straight off
 *   the wire, so the shapes should hold — but three endpoints this app calls
 *   have open contract questions in `docs/BLOCKERS.md` (`GET /buyers/{id}`,
 *   `GET /tx`, and a `tx_id` on the accepted `OfferDto`), and those screens
 *   degrade to a stated empty state rather than guessing a URL.
 */
export const USE_FIXTURES = true;

/**
 * S15's empty-lots state (`fxMyLotsEmpty`) is otherwise unreachable in any
 * runnable mode — `USE_FIXTURES` always resolves to the populated `fxMyLots`,
 * and there is no real `/lots` endpoint yet to return zero rows from. Flip
 * this to `true`, rebuild, and S15 fetches `fxMyLotsEmpty` instead, so the
 * empty branch can actually be looked at on a device rather than trusted by
 * reading the code.
 *
 * ★ Only meaningful while `USE_FIXTURES` is `true`. **Must be `false` before
 *   any rehearsal or demo** — a judge who taps माझे लॉट and sees an empty
 *   list on a seeded farmer account reads as a bug, not as a state we chose
 *   to show. Check it in the same pass as `USE_FIXTURES` itself.
 */
export const FIXTURE_LOTS_EMPTY = false;

/** How long a cached response stays fresh before the stale banner appears. */
export const CACHE_STALE_MS = 5 * 60 * 1000;

/** Chat polling interval. TanStack Query, not websockets — see 12_STACK.md. */
export const CHAT_POLL_MS = 4000;

export const DEFAULT_HORIZON_DAYS = 14;

/**
 * The demo scenario — the same commodity/market pair CANON §7.4's own example
 * uses (`cmd_onion` / `mkt_lasalgaon`).
 *
 * ★ The market tab no longer reads these. It has a crop picker and a district
 *   picker, so a farmer growing tomato in Ahmednagar is no longer shown onion
 *   at Lasalgaon with no control to say otherwise: the district defaults to
 *   his own (`user.district_id`, falling back to `DEFAULT_DISTRICT_ID`) and
 *   the mandi comes from `GET /ref/markets` for whichever district is picked.
 *
 * ★ The screens that still read the pair below are the ones about *one lot* —
 *   the verdict, the cost breakdown, the pledge, the publish flow. Those are
 *   not browsing prices; they are asking about a specific consignment, and
 *   they will read the commodity and mandi off `LotDto` once S12 creates a
 *   real one. TODO(pranay): that swap is P9/P10, not this screen's problem.
 */
export const DEFAULT_COMMODITY_ID = 'cmd_onion';
export const DEFAULT_MARKET_ID = 'mkt_lasalgaon';
export const DEFAULT_DISTRICT_ID = 'dist_nashik';

/**
 * `POST /ai/window/recommend`'s request body, CANON §7.4's own example values —
 * there is no lot-creation flow (S12, P9) or grading flow (S13) in scope yet, so
 * S9 asks for the same demo lot every other fixture in this app already agrees
 * on: 4000 kg, grade B. TODO(pranay): P9/P10 replace these with the farmer's
 * actual lot once one exists to ask about.
 */
export const DEFAULT_QTY_KG = 4000;
export const DEFAULT_GRADE: Grade = 'B';

/** S13's demo lot, matching `fxLotListed` in `fixtures/lots.ts` — the same
 * fixture-first pattern as `DEFAULT_COMMODITY_ID`/`DEFAULT_MARKET_ID` above,
 * until S12 (P9b, task D) exists to create a real one. */
export const DEFAULT_LOT_ID = 'lot_listed_1';

/**
 * ★ Not in CANON's wire contract — `05_AI_ARCHITECTURE.md` §6 and `NILESH.md` §2
 *   both document `NO_ADVICE_BAND_BPS=3500` (35%) as the server's refusal
 *   threshold, tuned server-side, not sent in `WindowRes`. PRANAY.md §1.7's own
 *   refusal-screen mockup renders it anyway ("मर्यादा: ३५%") for context next to
 *   `band_width_bps`. This is a real gap: if Nilesh retunes the threshold, this
 *   constant goes stale with no signal that it has. Update it by hand if he
 *   changes `NO_ADVICE_BAND_BPS`, or ask him to put it on the response instead.
 */
export const NO_ADVICE_BAND_THRESHOLD_BPS = 3500;
