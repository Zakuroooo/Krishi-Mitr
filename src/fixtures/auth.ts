/**
 * CANON §7.1-shaped fixtures for auth. Akash's A1 (`/auth/otp/*`, `/auth/register`)
 * does not exist yet — `api/` is not in this repo. Every key here is transcribed
 * from CANON §7.1, the same discipline as `fixtures/window.ts`.
 *
 * ★ `verifyOtp` is simulated to always fail in fixture mode, on purpose.
 *
 *   CANON says wrong-code and unknown-phone return the identical error, so the
 *   real client can never know in advance which case it is in — it always tries
 *   verify first and falls through to S3 (register) on any failure. Simulating
 *   verify as "always fails" exercises that exact fallback path (S2 -> S3 ->
 *   register -> sign in) on every fixture run, which is the more complex path and
 *   the one CANON calls out by name: "Post-OTP for new users." The simpler
 *   returning-user path (verify succeeds, S3 never renders) is the same code
 *   either way and needs no separate fixture to prove it works.
 */

import type { AuthRes, District, OtpRequestRes } from '../types/api';

/** `dev_otp` mirrors what the real endpoint echoes when `DEV_OTP_ECHO=1`. */
export const fxOtpRequest: OtpRequestRes = {
  ok: true,
  expires_in_s: 300,
  dev_otp: '123456',
};

/**
 * The registration success path. `id` and `district_id` are fixture-only strings —
 * they match `fxDistricts` below so S3's picker and this response agree with each
 * other, the same way `fxSellElsewhere` agrees with `/prices/nearby`'s example.
 */
export const fxAuthRegistered: AuthRes = {
  token: 'fixture-token-farmer',
  user: {
    id: 'usr_fixture_1',
    phone: '9876543210',
    // ★ A real Marathi name, not "Fixture Farmer". Every screen that greets
    //   the signed-in user renders this, so the placeholder was visible on the
    //   menu, the profile and the narration — in English, on a Marathi app.
    name: 'रामभाऊ पाटील',
    role: 'FARMER',
    locale: 'mr',
    district_id: 'dist_nashik',
  },
};

/**
 * The same success path for a buyer. Buyers register with the identical
 * phone + OTP flow — the only difference is the role, which decides which
 * navigator the root renders. `district_id` is carried because `User`
 * requires it; a buyer's district is where he collects from, not where he
 * farms.
 */
export const fxAuthRegisteredBuyer: AuthRes = {
  token: 'fixture-token-buyer',
  user: {
    id: 'usr_fixture_buyer_1',
    phone: '9876543211',
    name: 'सुनील ट्रेडर्स',
    role: 'BUYER',
    locale: 'mr',
    district_id: 'dist_nashik',
  },
};

/**
 * ★ CONTRACT GAP, blocker filed: CANON §6.2's `users.locale` CHECK constraint is
 *   `in ('mr','en')` — it excludes `hi`. Hindi is a committed Phase-1 feature
 *   (PLAN.md §8, SH9) and `types/api.ts`'s own `Locale` type already includes it.
 *   This fixture sends whatever the app's real `Locale` type allows; the DB
 *   constraint is the thing that needs to change, not the client.
 */

/**
 * `GET /ref/districts` — Kartik's K5 does not exist yet either. Real Maharashtra
 * districts only, matching the Nashik onion belt setting. Niphad — which appears
 * in `fixtures/window.ts` as `warehouse_id: 'wh_niphad'` — is a taluka inside
 * Nashik district, not a district itself; it does not belong in this list.
 */
export const fxDistricts: District[] = [
  { id: 'dist_nashik', name: 'Nashik', name_mr: 'नाशिक' },
  { id: 'dist_ahmednagar', name: 'Ahmednagar', name_mr: 'अहमदनगर' },
  { id: 'dist_pune', name: 'Pune', name_mr: 'पुणे' },
];
