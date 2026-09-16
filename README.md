# Krishi Mitr — web app

**SIH 2026 · Problem Statement 26132 · Government of Maharashtra**

Should I sell today, or wait? Krishi Mitr answers that in the farmer's own
language, shows the worst case at the same size as the gain, and says
"no advice" when the model is not confident enough to answer.

This repository is the **web build of the mobile app** — the farmer app and the
buyer console, both of them, running in a browser.

**Live: https://krishi-mitr-alpha.vercel.app**

## This is the same code, not a rewrite

`src/` holds the React Native source from the mobile app, compiled for the
browser with [`react-native-web`](https://necolas.github.io/react-native-web/).
Every screen, the navigation, the design tokens, the three dictionaries and the
fixtures are the files the phone runs.

That was a deliberate call: a second, hand-written web implementation of 45
screens drifts from the app within a week, and then the demo is two different
products wearing one name.

Only two things here are web-only:

| File | Why it exists |
|---|---|
| `src/screens/web/Landing.tsx` | A URL has no "I installed this on purpose" context. The landing page asks farmer or buyer, then hands over to the unchanged phone flow. |
| `src/web-shims/` | Five native modules have no browser equivalent. Each shim implements the same API over a web platform feature. |

### The shims

| Native module | Replaced by | Notes |
|---|---|---|
| `react-native-tts` | Web Speech API | The fallback voice. Marathi/Hindi coverage varies by browser; when there is no voice the app reports that honestly, exactly as it does on an Android device with no language pack. |
| `react-native-sound` | `HTMLAudioElement` | Plays the Sarvam clip. Bundled `.mp3` clip ids are an Android asset concept and always miss here, which is the same path a phone with a missing clip takes. |
| `react-native-fs` | In-memory map | Only ever used to park Sarvam's base64 audio somewhere playable; a data URL already is that. |
| `react-native-image-picker` | `<input type="file" capture>` | Opens the rear camera on a phone browser, a file chooser on a laptop. |
| `react-native-audio-recorder-player` | `MediaRecorder` | Mic capture for the voice onboarding. |

## Running it

```bash
npm install
npm start          # http://localhost:8080
npm run build      # -> dist/
```

Node 18+.

`npm run build` is webpack followed by `scripts/copy-static.js`, which copies
everything in `public/` except `index.html` into `dist/`. HtmlWebpackPlugin
emits the HTML but knows nothing about the files beside it, so without that
step the favicon, the manifest and the social image are referenced by the page
and 404 in production.

## Icons and metadata

One drawing, `public/favicon.svg` — the same mark `src/components/ui/Logo.tsx`
draws, with the disc widened to the box edge because transparent corners on a
browser tab read as a chipped icon. The rasters are generated from it rather
than drawn again:

| File | Size | Where it shows |
|---|---|---|
| `favicon.svg` | any | Browser tab, modern browsers |
| `favicon-32.png` | 32 | Older browsers |
| `apple-touch-icon.png` | 180 | iOS home screen |
| `icon-192.png` / `icon-512.png` | 192 / 512 | Android home screen, PWA install |
| `og-image.png` | 1200×630 | WhatsApp, X and Slack link previews |

`og-image.png` is rendered from `scripts/og-image.html`. It matters more here
than usual: this link travels by WhatsApp, not by search, and a bare URL in a
farmer group is a link nobody taps. The preview shows both figures at the same
size, because I16 holds in a link preview too.

`site.webmanifest` makes the site installable — Marathi as the language,
parchment as the splash background, terracotta as the theme colour.

## What is real and what is a fixture

`src/config.ts` has `USE_FIXTURES = true`, so every screen renders from
`src/fixtures/` — CANON-shaped sample data, no API. That is the same setting
the demo build uses, and it is why this deploys as a static site with no
backend.

**The figures in this deployment are sample data.** The forecasting model
(LightGBM quantile, p10/p50/p90) is trained on real Agmarknet onion and
soyabean series and lives in the API repo, which is not deployed here.

The voice is the one live path: with the API running, `/voice/narrate` returns
Sarvam audio. Without it, the browser's own speech engine reads the screen.

## The two doors

- **Farmer** — landing → splash → language → phone → OTP → profile → home, then
  prices, the verdict with both numbers, cost breakdown, the pledge card,
  listing a lot, grading, buyers, bargaining, escrow and the deals list.
- **Buyer** — signs straight into the buyer console with the fixture account:
  post demand, matches, lot detail, offers, escrow timeline, reliability, data
  provenance and disputes.

## What has been checked, and what has not

Rendered in a headless browser against the production bundle, with the console
watched for errors:

- the landing page, in all three languages
- the farmer home — today's price, the 7-day bars, the verdict with the gain
  and the worst case side by side, active lots, the tab bar
- the buyer console — post demand, and all eight of its tabs

No console errors on any of the three.

Two limits worth knowing before a demo:

- ~~**One URL.**~~ **Fixed.** Every screen now has a path — `/start`,
  `/language`, `/app/home/verdict`, `/trader/matches/lot/:lot_id` — via
  `src/navigation/webLinking.ts`. A refresh keeps you where you were, screens
  can be linked to, and the browser's back button goes back one screen instead
  of leaving the site. Verified against production: those paths answer 200 and
  mount the right screen.
- **Voice needs a browser that has the language.** Sarvam is the real voice and
  it needs the API; without it the fallback is the browser's own speech engine,
  whose Marathi and Hindi coverage varies by device. The app reports that
  honestly rather than silently reading Marathi in an English voice.

## Invariants this build keeps

The app's rules are in `CLAUDE.md` in the main repository. The two a judge
tests are I4 (another actor's row returns 404, never their data) and I6 (the
model may refuse). I16 — the worst case renders at the same font size as the
expected gain — is visible on every verdict screen here.

No Aadhaar, anywhere (I9). No secrets in this repository (I10).
