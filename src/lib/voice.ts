/**
 * voice.ts — Marathi offline voice engine.
 * Decomposes rupees and days into sequenced audio clips, then plays them back
 * with `react-native-sound`. Works 100% offline (I7) — every clip is a local
 * file, never a network fetch, so airplane mode is the expected path, not an
 * edge case.
 *
 * ★ CANON/12_STACK.md §"Voice" names `react-native-sound` as the sanctioned
 *   library for exactly this (pre-generated clips, sequenced), with
 *   `react-native-tts` documented as the *fallback* — not `expo-av`, since
 *   this is React Native CLI with no Expo runtime at all.
 *
 * ★ THE PRE-GENERATED CLIP CONTENT IS NOT SHIPPED IN THIS COMMIT. Generating
 *   ~123 real Marathi speech mp3s (one per id, per `assets/audio/mr/README.md`)
 *   is a TTS content pass over real audio, which nothing in a coding session
 *   can produce — so `react-native-tts` is not the fallback-of-last-resort
 *   here, it is doing the actual work: `speak()` tries the pre-generated clip
 *   first (silent today, since none exist) and falls back to the device's
 *   on-device TTS engine speaking the same Marathi text live. This is what
 *   keeps beat 7 ("voice, then airplane mode") non-silent without the mp3s —
 *   `react-native-tts` needs no network either, it speaks through whatever
 *   TTS engine and voice data are already installed on the phone.
 */

import Sound from 'react-native-sound';
import Tts from 'react-native-tts';
import type { Locale, WindowRes } from '../types/api';
import type { TFn } from './i18n';
import { buildVerdictNarrationFor } from './verdictVoice';
// ★ Upstream wrote this as `from '../api'`, which resolves to `src/api` — a
//   file that does not exist, so the narration would have failed to bundle.
//   `voice.ts` and `api.ts` are siblings in `lib/`.
import { narrate } from './api';
import { getSarvamPace, getSarvamSpeaker, getTtsRate } from './voiceSettings';

/**
 * Every ASCII, Android-resource-safe (`[a-z0-9_]+`, no Devanagari) clip id
 * this engine ever asks `react-native-sound` to load, and the Marathi text
 * it corresponds to — this map is the spec for whoever records or generates
 * the clips, and `assets/audio/mr/README.md` is derived from it.
 */
const CLIP_TEXT_MR: Record<string, string> = {
  hold: 'थांबा',
  sell_now: 'आज विका',
  sell_elsewhere: 'दुसऱ्या बाजारात विका',
  split: 'अर्धा आज विका',
  no_advice: 'सल्ला नाही',
  days: 'दिवस',
  exp_gain: 'अपेक्षित फायदा',
  worst_case: 'सर्वात वाईट स्थिती',
  rupees: 'रुपये',
  rupees_loss: 'रुपये तोटा',
  quintal: 'क्विंटल',
  thousand: 'हजार',
  lakh: 'लाख',
  minus: 'उणे',
};

/** Marathi 0–99, keyed by the number — `numberClipId(n)` turns a value here
 * into the ASCII id (`n7`) this engine actually loads by filename. */
const MARATHI_NUMBER_NAMES: Record<number, string> = {
  0: 'शून्य', 1: 'एक', 2: 'दोन', 3: 'तीन', 4: 'चार', 5: 'पाच', 6: 'सहा', 7: 'सात', 8: 'आठ', 9: 'नऊ', 10: 'दहा',
  11: 'अकरा', 12: 'बारा', 13: 'तेरा', 14: 'चौदा', 15: 'पंधरा', 16: 'सोळा', 17: 'सतरा', 18: 'अठरा', 19: 'एकोणीस', 20: 'वीस',
  21: 'एकवीस', 22: 'बावीस', 23: 'तेवीस', 24: 'चोवीस', 25: 'पंचवीस', 26: 'सव्वीस', 27: 'सत्तावीस', 28: 'अठ्ठावीस', 29: 'एकोणतीस', 30: 'तीस',
  31: 'एकतीस', 32: 'बत्तीस', 33: 'तेत्तीस', 34: 'चौतीस', 35: 'पाचतीस', 36: 'छत्तीस', 37: 'सदतीस', 38: 'अडतीस', 39: 'एकोणचाळीस', 40: 'चाळीस',
  41: 'एकचाळीस', 42: 'बेचाळीस', 43: 'त्रेचाळीस', 44: 'चौचाळीस', 45: 'पंचाळीस', 46: 'सहाचाळीस', 47: 'सतचाळीस', 48: 'अडचाळीस', 49: 'एकोणपन्नास', 50: 'पन्नास',
  51: 'एकपन्नास', 52: 'बावन्न', 53: 'त्रेपन्न', 54: 'चौपन्न', 55: 'पंचपन्न', 56: 'छापन्न', 57: 'सत्तावन्न', 58: 'अठ्ठावन्न', 59: 'एकोणसाठ', 60: 'साठ',
  61: 'एकसाठ', 62: 'बासाठ', 63: 'त्रेसाठ', 64: 'चौसाठ', 65: 'पासष्ट', 66: 'सहासाठ', 67: 'सदसाठ', 68: 'अडसाठ', 69: 'एकोणसत्तर', 70: 'सत्तर',
  71: 'एकसत्तर', 72: 'बायत्तर', 73: 'त्र्याहत्तर', 74: 'चौहत्तर', 75: 'पंचहत्तर', 76: 'शहात्तर', 77: 'सतहत्तर', 78: 'अठ्ठ्याहत्तर', 79: 'एकोणऐंशी', 80: 'ऐंशी',
  81: 'एकऐंशी', 82: 'ब्याऐंशी', 83: 'त्र्याऐंशी', 84: 'चौऱ्याऐंशी', 85: 'पंचऐंशी', 86: 'शहाऐंशी', 87: 'सत्ताऐंशी', 88: 'अठ्ठाऐंशी', 89: 'एकोणनव्वद', 90: 'नव्वद',
  91: 'एकणव्वद', 92: 'ब्याणव्वद', 93: 'त्र्याणव्वद', 94: 'चौऱ्याणव्वद', 95: 'पंचणव्वद', 96: 'शहाणव्वद', 97: 'सत्ताणव्वद', 98: 'अठ्ठाणव्वद', 99: 'नऊणव्वद',
};

/** Marathi hundreds (100–900), keyed 1–9 — `hundredsClipId(n)` turns a value
 * here into the ASCII id (`h3`) this engine actually loads by filename. */
const MARATHI_HUNDREDS: Record<number, string> = {
  1: 'शंभर', 2: 'दोनशे', 3: 'तीनशे', 4: 'चारशे', 5: 'पाचशे', 6: 'सहाशे', 7: 'सातशे', 8: 'आठशे', 9: 'नऊशे',
};

/**
 * `n0`..`n99` — Android resource names cannot be Devanagari, so the clip id
 * that actually flows through `decomposeRupees`/`decomposeDays`/`speak` is
 * this ASCII form, never the Marathi word itself. Returns `null` outside
 * 0–99, same as the old "lookup came back undefined" guard this replaces —
 * a rupee amount in the crores still silently drops that one word rather
 * than crashing, which is a pre-existing gap in scope (lakhs was never
 * bounded past 99) and not something this change is trying to fix.
 */
function numberClipId(n: number): string | null {
  return n in MARATHI_NUMBER_NAMES ? `n${n}` : null;
}

/** `h1`..`h9` — see `numberClipId`. */
function hundredsClipId(n: number): string | null {
  return n in MARATHI_HUNDREDS ? `h${n}` : null;
}

/**
 * Decomposes rupee amount in paise to a sequence of clip ids.
 * Example: 629000 paise -> ₹6,290 -> ["n6", "thousand", "h2", "n90", "rupees"]
 */
export function decomposeRupees(paise: number): string[] {
  const isNegative = paise < 0;
  let rupees = Math.trunc(Math.abs(paise) / 100);
  const clips: string[] = [];

  if (isNegative) {
    clips.push('minus');
  }

  if (rupees === 0) {
    clips.push('n0', 'rupees');
    return clips;
  }

  // Lakhs (1,00,000+)
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    rupees %= 100000;
    const lakhsId = numberClipId(lakhs);
    if (lakhsId) {
      clips.push(lakhsId);
    }
    clips.push('lakh');
  }

  // Thousands (1,000+)
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    rupees %= 1000;
    const thousandsId = numberClipId(thousands);
    if (thousandsId) {
      clips.push(thousandsId);
    }
    clips.push('thousand');
  }

  // Hundreds (100-900)
  if (rupees >= 100) {
    const hundreds = Math.floor(rupees / 100);
    rupees %= 100;
    const hundredsId = hundredsClipId(hundreds);
    if (hundredsId) {
      clips.push(hundredsId);
    }
  }

  // Remaining 1-99
  const remainderId = numberClipId(rupees);
  if (rupees > 0 && remainderId) {
    clips.push(remainderId);
  }

  clips.push(isNegative ? 'rupees_loss' : 'rupees');
  return clips;
}

export function decomposeDays(days: number): string[] {
  const clips: string[] = [];
  const daysId = numberClipId(days);
  if (daysId) {
    clips.push(daysId);
  } else {
    // Outside the 0-99 vocabulary this engine has words for at all — every
    // digit read out individually beats silence for a hold period that long.
    for (const digit of String(days)) {
      const digitId = numberClipId(Number(digit));
      if (digitId) clips.push(digitId);
    }
  }
  clips.push('days');
  return clips;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One player per clip id, loaded once and reused — a verdict spoken twice in
 * one session (the farmer taps 🔊 again) does not re-hit the filesystem for
 * every word a second time.
 */
const soundCache = new Map<string, Sound>();

/**
 * Loads (or returns the cached) `Sound` for a clip id. Resolves to `null`,
 * never rejects, when the file does not exist or fails to decode — a
 * missing clip is not this function's business to escalate; `speak` decides
 * what a gap in the sequence means (it skips it and keeps going).
 */
function loadClip(id: string): Promise<Sound | null> {
  const cached = soundCache.get(id);
  if (cached) return Promise.resolve(cached);

  return new Promise(resolve => {
    const sound = new Sound(`${id}.mp3`, Sound.MAIN_BUNDLE, error => {
      if (error) {
        resolve(null);
        return;
      }
      soundCache.set(id, sound);
      resolve(sound);
    });
  });
}

function playClip(sound: Sound): Promise<void> {
  return new Promise(resolve => {
    sound.play(() => resolve());
  });
}

/**
 * `Tts.setDefaultLanguage('mr-IN')` once, best-effort — plenty of Android
 * phones ship with no Marathi voice data installed at all, and this must
 * never block or throw on that. If it fails, `Tts.speak()` still falls back
 * to whatever the device's default TTS language is, which beats no sound.
 */
/**
 * BCP-47 tags for the three locales the app offers. The engine needs the
 * region: bare 'hi' picks whatever Hindi voice the device defaults to, and on
 * many Indian devices that is not an Indian one.
 */
const TTS_LANGUAGE: Record<Locale, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

/** The locale the engine is currently set to, so we only pay for a change. */
let ttsCurrentLocale: Locale | null = null;

/**
 * ★ This used to hardcode `'mr-IN'` and cache the promise forever, so the
 *   engine was set to Marathi once at first use and never changed again. Two
 *   reported bugs came out of that single line: the verdict spoke Marathi to
 *   a farmer who had chosen English, and Hindi text read aloud in a Marathi
 *   voice mispronounced even the product's own name. The engine is now set
 *   to whichever locale the caller is speaking in, and re-set when it
 *   changes.
 */
/**
 * The last rate we pushed to the engine, so we only call the bridge when the
 * farmer has actually changed the setting.
 */
let ttsCurrentRate: number | null = null;

/**
 * Picks the best installed voice for a locale and remembers it.
 *
 * ★ Why this matters more than it looks. The stock Android engine, left to
 *   itself, reads Marathi with whatever voice happens to be default — often a
 *   low-quality or wrong-language one, which is exactly the "cannot understand
 *   it" complaint about the fallback. `Tts.voices()` lists what is actually
 *   installed, so we can choose a real `mr-IN` voice, prefer a non-network one
 *   (it keeps working with no signal), and skip any the engine flags as
 *   `notInstalled`.
 *
 * ★ Best-effort throughout. An engine that exposes no voices, or none for this
 *   language, keeps its default — a wrong accent still beats silence.
 */
async function ensureTtsVoice(locale: Locale): Promise<void> {
  try {
    const wanted = TTS_LANGUAGE[locale].toLowerCase();
    const voices = (await Tts.voices()) as Array<{
      id: string;
      language: string;
      quality?: number;
      notInstalled?: boolean;
      networkConnectionRequired?: boolean;
    }>;
    const usable = voices.filter(
      v => v.language?.toLowerCase().startsWith(wanted.slice(0, 2)) && !v.notInstalled,
    );
    if (usable.length === 0) {
      // ★ The device has no voice for this language. `setDefaultLanguage`
      //   often still reports success here and then reads the text with
      //   whatever voice it does have — which is how Marathi text ends up
      //   spoken by an English voice, and English text by a Marathi one. That
      //   is the "wrong language" symptom, and it lives in the *fallback*
      //   engine, never in Sarvam.
      //
      //   Nothing can be done about a missing voice from inside the app, so
      //   the honest thing is to keep the flag unset and let the next call
      //   retry rather than caching a language the engine never really took.
      ttsCurrentLocale = null;
      return;
    }
    // Highest quality first, and among equals prefer one that does not need
    // the network — the whole point of this path is that the server is gone.
    usable.sort(
      (a, b) =>
        (b.quality ?? 0) - (a.quality ?? 0) ||
        Number(a.networkConnectionRequired ?? false) - Number(b.networkConnectionRequired ?? false),
    );
    await Tts.setDefaultVoice(usable[0]!.id);
  } catch {
    // No voice list, or the engine refused the id. Keep the default.
  }
}

async function ensureTtsLanguage(locale: Locale = 'mr'): Promise<void> {
  // ★ The rate is applied every time, not only on a locale change — the
  //   farmer can change speed without changing language, and the engine keeps
  //   whatever rate it was last given.
  const rate = getTtsRate();
  if (ttsCurrentRate !== rate) {
    try {
      await Tts.setDefaultRate(rate, true);
      ttsCurrentRate = rate;
    } catch {
      // Engine without rate control; it just speaks at its own pace.
    }
  }

  if (ttsCurrentLocale === locale) return;
  try {
    await Tts.setDefaultLanguage(TTS_LANGUAGE[locale]);
    // A slightly lower pitch is easier to follow on a small phone speaker in
    // an open-air mandi than the engine's default.
    try {
      await Tts.setDefaultPitch(0.95);
    } catch {
      /* optional */
    }
    await ensureTtsVoice(locale);
    ttsCurrentLocale = locale;
  } catch {
    // An engine without the language installed keeps whatever it had. Better
    // a wrong accent than silence.
  }
}

/**
 * Speaks `text` through the device's on-device TTS engine and resolves when
 * it finishes, errors, or is cancelled — never rejects.
 *
 * ★ THE BUG THIS FIXES, because it is subtle and it wedged the UI on every
 *   screen. The previous version did:
 *
 *       let utteranceId: string | number;
 *       const done = e => { if (e.utteranceId !== utteranceId) return; ... }
 *       utteranceId = Tts.speak(text);
 *
 *   `react-native-tts`'s TypeScript declaration says `speak()` returns
 *   `string | number`. It does not. The Android native method is
 *   `speak(String utterance, ReadableMap params, Promise promise)` — a
 *   `Promise` parameter — so the bridge hands JavaScript back a **Promise**,
 *   and `utteranceId` was a Promise object. `e.utteranceId !== utteranceId`
 *   was therefore true for every event ever fired, `done` never resolved,
 *   and this function returned a promise that never settled.
 *
 *   Every caller `await`s it inside a `try/finally` that flips a `speaking`
 *   flag back off. The `finally` never ran. So the listen button changed to
 *   the muted-speaker icon when tapped and stayed that way for the life of
 *   the screen, on every screen, and the narration could not be replayed
 *   because the button was already showing its "stop" state. The
 *   `.d.ts` being wrong is why this compiled and why it survived review.
 *
 * ★ The id is now awaited before it is compared, completions that arrive
 *   before the id is known are honoured rather than dropped, and a guard
 *   timer settles the promise if the engine never reports at all. The UI
 *   flag can no longer be left stuck on by anything the engine does.
 */
const TTS_GUARD_MS = 60_000;

function speakViaTts(text: string): Promise<void> {
  return new Promise(resolve => {
    let settled = false;
    /** Known only once `Tts.speak()`'s promise resolves. */
    let utteranceId: string | number | null = null;
    /** A completion that arrived while the id was still unknown. */
    let finishedEarly = false;

    /**
     * ★ Unsubscribed through the returned subscriptions, not through
     *   `Tts.removeEventListener`. That method calls `this.removeListener()`
     *   on its `NativeEventEmitter` base — a method React Native deleted —
     *   so it threw `this.removeListener is not a function` the moment any
     *   utterance finished, and the red box took over the screen. It fired
     *   from `finish()`, meaning it hit on *every* successful narration.
     *   `addEventListener` already hands back an `EmitterSubscription`; that
     *   is what we keep and call `.remove()` on.
     */
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      for (const sub of subscriptions) {
        try {
          sub.remove();
        } catch {
          // Already gone.
        }
      }
      resolve();
    };

    const onDone = (event?: { utteranceId?: string | number }) => {
      if (utteranceId === null) {
        // The engine beat us to it. Remember, and settle once we know the id
        // — or, if we never learn it, the guard below still ends this.
        finishedEarly = true;
        return;
      }
      const id = event?.utteranceId;
      if (id !== undefined && id !== utteranceId) return;
      finish();
    };

    const guard = setTimeout(finish, TTS_GUARD_MS);

    /* ★ The library's `.d.ts` types this as returning `void`; the JavaScript
       returns `this.addListener(...)`, an `EmitterSubscription`. Same lying
       declaration as `speak()` a few lines up, and the cast is here so the
       real return value can be used to unsubscribe. */
    const subscribe = (event: 'tts-finish' | 'tts-error' | 'tts-cancel') =>
      Tts.addEventListener(event, onDone) as unknown as { remove: () => void } | undefined;

    const subscriptions = [
      subscribe('tts-finish'),
      subscribe('tts-error'),
      subscribe('tts-cancel'),
    ].filter((sub): sub is { remove: () => void } => typeof sub?.remove === 'function');

    // Typed as `string | number` by the library and actually a Promise on
    // Android. `Promise.resolve` accepts either, so this handles both without
    // depending on which one the platform gives us.
    try {
      Promise.resolve(Tts.speak(text) as unknown as string | number).then(
        id => {
          utteranceId = id ?? '';
          if (finishedEarly) finish();
        },
        () => finish(),
      );
    } catch {
      finish();
    }
  });
}

/** Every clip id's Marathi text, for the TTS fallback below — the same
 * lookup `allClipTexts()` exposes, kept as one map rather than rebuilding
 * it per call. */
const CLIP_TEXT_BY_ID: Record<string, string> = (() => {
  const all: Record<string, string> = { ...CLIP_TEXT_MR };
  for (const [n, text] of Object.entries(MARATHI_NUMBER_NAMES)) {
    all[`n${n}`] = text;
  }
  for (const [n, text] of Object.entries(MARATHI_HUNDREDS)) {
    all[`h${n}`] = text;
  }
  return all;
})();

/**
 * Plays a sequence of clip ids, one after another, waiting for each to
 * finish before starting the next — this is speech, and a farmer needs the
 * words in order, not overlapping.
 *
 * A clip id whose pre-generated file does not exist falls back to on-device
 * TTS speaking the same Marathi text live, rather than being silently
 * skipped — see this file's header. Only an id with no Marathi text at all
 * (a caller's typo — cannot happen from this module's own two decompose
 * functions) is actually skipped.
 */
export async function speak(clips: string[]): Promise<void> {
  await ensureTtsLanguage('mr');
  for (const id of clips) {
    const sound = await loadClip(id);
    if (sound) {
      await playClip(sound);
      continue;
    }
    const text = CLIP_TEXT_BY_ID[id];
    if (text) {
      await speakViaTts(text);
    }
  }
}

/**
 * Speaks arbitrary Marathi text live through the device's on-device TTS
 * engine — for text that cannot be a pre-generated clip sequence because it
 * is not known until runtime (a farmer's own name, a village they typed or
 * spoke). `speak()` above is for the fixed, decomposable vocabulary
 * (rupees, days); this is for everything else voice.ts is asked to say.
 */
export async function speakText(text: string, locale: Locale = 'mr'): Promise<void> {
  // ★ Stop whatever is in flight before starting. Without this a second tap
  //   either queued behind the first or was dropped by the engine, which is
  //   why the speaker "only played once" — tapping again did nothing audible
  //   and there was no way to replay a sentence a farmer missed.
  await stopSpeaking();
  const generation = speechGeneration;
  await ensureTtsLanguage(locale);
  if (generation !== speechGeneration) return;
  await speakViaTts(text);
}

/**
 * What every Listen button on every screen now calls.
 *
 * ★ Prefers Sarvam's human-grade voice over the device's own TTS, and falls
 *   back the moment the server is unreachable. The two are not close: stock
 *   Android Marathi TTS is barely intelligible on a cheap handset, and the
 *   whole premise of this product is a farmer who does not read fluently.
 *   The verdict screen has preferred Sarvam since the backend team wired
 *   `/voice/narrate`; there was no reason the other twenty screens should
 *   not, and the fallback means a network problem downgrades the voice
 *   rather than silencing it.
 *
 * ★ I7 is not broken by this. The demo's guarantee is that it survives with
 *   *no* network, and it does — the fallback is on-device and offline. This
 *   only spends a round trip when there is one to spend.
 */
export async function speakSmart(text: string, locale: Locale = 'mr'): Promise<void> {
  await stopSpeaking();
  const generation = speechGeneration;

  // ★ Straight to the device engine when this build cannot play a Sarvam
  //   clip. Trying anyway costs a full network round trip and ends in the
  //   same place, which is precisely the delay farmers were feeling.
  if (!canPlaySarvam()) {
    // ★ Say why out loud in dev. This path used to be silent, which is how
    //   "the server voice never plays" went undiagnosed: the app fell back
    //   correctly and told nobody it had.
    if (__DEV__) console.warn('[voice] Sarvam unavailable: react-native-fs missing → device TTS');
    await ensureTtsLanguage(locale);
    if (generation !== speechGeneration) return;
    await speakViaTts(text);
    return;
  }

  try {
    await speakViaSarvam(text, locale, generation);
  } catch (err) {
    // The farmer pressed stop while the clip was still coming down; do not
    // start the fallback on top of a deliberate silence.
    if (generation !== speechGeneration) return;
    if (__DEV__) {
      console.warn('[voice] Sarvam failed → device TTS:', (err as Error)?.message ?? String(err));
    }
    await ensureTtsLanguage(locale);
    if (generation !== speechGeneration) return;
    await speakViaTts(text);
  }
}

/**
 * The Sarvam player currently holding audio, if any.
 *
 * ★ Why this is module state rather than a local: there are two ways this
 *   app makes sound — the on-device TTS engine and an `AudioRecorderPlayer`
 *   playing a Sarvam clip — and `stopSpeaking()` has to silence both. Before
 *   this, stopping only reached the TTS engine, so a farmer who tapped a
 *   Listen button that had chosen the Sarvam path had no way to stop it. He
 *   could leave the screen and the voice would keep talking.
 */
let activePlayer: { stopPlayer: () => Promise<unknown>; removePlayBackListener: () => void } | null =
  null;

/**
 * Bumped on every stop. Anything mid-flight compares the generation it
 * started under against this and gives up if it has moved — otherwise a
 * Sarvam clip that was still downloading when the farmer pressed stop would
 * begin playing a second later, with nothing left to stop it.
 */
let speechGeneration = 0;

/**
 * Everyone who wants to know when the app starts or stops talking.
 *
 * ★ Why this exists. Every `ListenButton` tracked its own run id, but there is
 *   only **one** audio engine. Tap the speaker on a card while the header's is
 *   playing and `speakSmart` stops the header — correctly — but the header's
 *   button never finds out. Its own run id still matches, so it sits on
 *   "Playing…" forever with nothing playing. Same on navigating away.
 *
 *   The generation counter already tells us when speech was superseded; it
 *   just had no way to reach the UI. Now it does.
 */
type SpeechListener = () => void;
const speechListeners = new Set<SpeechListener>();

export function subscribeSpeech(cb: SpeechListener): () => void {
  speechListeners.add(cb);
  return () => speechListeners.delete(cb);
}

/** The generation a caller can compare against to see if it was superseded. */
export function currentSpeechGeneration(): number {
  return speechGeneration;
}

function notifySpeechChanged(): void {
  for (const cb of speechListeners) {
    try {
      cb();
    } catch {
      // A listener that throws must not stop the others from being told.
    }
  }
}

/** Cancels anything in flight — TTS or Sarvam. Safe to call when silent. */
export async function stopSpeaking(): Promise<void> {
  speechGeneration += 1;
  notifySpeechChanged();
  try {
    await Tts.stop();
  } catch {
    // Nothing was speaking.
  }
  const player = activePlayer;
  activePlayer = null;
  if (player) {
    try {
      player.removePlayBackListener();
      await player.stopPlayer();
    } catch {
      // Already stopped, or never started.
    }
  }
}

/**
 * The sale-window voice agent: composes the full spoken Marathi narration for
 * a `WindowRes` (action + worth + pledge) and speaks it.
 *
 * It prefers Sarvam's prosthetic, human-grade Marathi voice (the backend
 * `POST /voice/narrate` synthesizes the dynamic sentence on demand — a lot,
 * dates and amounts can't be pre-recorded clips). Sarvam needs a server round
 * trip and a writable cache file to play back, so on-device TTS
 * (`speakText`, offline, zero deps) is the guaranteed fallback: a network or
 * server problem never silences the verdict, it only downgrades the voice.
 * This is what S9 auto-plays on load and what the 🔊 button replays — richer
 * than the clip-sequence `speakVerdict` below, because a farmer deciding
 * whether to hold needs the whole trade in his ear, not isolated word-clips.
 */
export async function speakSaleWindow(v: WindowRes, locale: Locale = 'mr'): Promise<void> {
  // ★ Composed and spoken in the farmer's own language. This used to build
  //   Marathi unconditionally and call `narrate(..., 'mr')`, so choosing
  //   English on S1 still produced a Marathi verdict — the exact complaint
  //   from the device.
  const narration = buildVerdictNarrationFor(v, locale);
  await stopSpeaking();
  // Same probe as `speakSmart` — no point paying for audio this build has no
  // way to play. See `canPlaySarvam`.
  if (!canPlaySarvam()) {
    await speakText(narration, locale);
    return;
  }
  try {
    await speakViaSarvam(narration, locale);
  } catch {
    await speakText(narration, locale);
  }
}

/**
 * Fetch `narration` as Sarvam-synthesized audio and play it. Resolves on
 * success; rejects on any failure so the caller can fall back to on-device
 * TTS. The flow: narrate -> base64 WAV -> temp cache file -> recorder player.
 * Throws (does not swallow) on network/fs/playback errors by design — the
 * fallback lives in `speakSaleWindow`, not here.
 */
/**
 * Whether the Sarvam path can run at all on this build.
 *
 * ★ Why this exists: `react-native-fs` is a *native* module. It was added to
 *   package.json at 09:48; the APK on the test device was built at 09:06, so
 *   its native side is simply not in the binary. `require()` still returns a
 *   JS object, but every property read goes through `NativeModules.RNFSManager`
 *   — which is null — and throws
 *   "cannot read property 'RNFSFileTypeRegular' of null".
 *
 * ★ Why it is checked *before* the network call and not caught after: the
 *   throw used to happen only once `narrate()` had already come back, so
 *   every Listen tap paid the full Sarvam round trip, threw, and only then
 *   started on-device TTS. That is the four-to-five second delay — the app
 *   was waiting for audio it had no way to play. Probing first turns an
 *   unusable Sarvam path into an instant fallback.
 *
 * ★ Memoised, because the answer cannot change within a run: a native module
 *   is either linked into this binary or it is not.
 */
let sarvamPlayable: boolean | null = null;

function canPlaySarvam(): boolean {
  if (sarvamPlayable !== null) return sarvamPlayable;
  try {
    const RNFS = require('react-native-fs');
    // Touch the property that actually crosses the bridge. A missing native
    // module throws here rather than returning undefined.
    sarvamPlayable = typeof RNFS?.CachesDirectoryPath === 'string';
  } catch {
    sarvamPlayable = false;
  }
  return sarvamPlayable;
}

/**
 * Sarvam rejects any single input over 500 characters:
 *
 *     "inputs.0: String should have at most 500 characters"
 *
 * ★ This is the bug that made the server voice look broken. The narration used
 *   to be a handful of "label: value" fragments and fitted easily; once it
 *   became a real explanation — price, advice, reason, gain, risk, cost, next
 *   step — it blew past 500, Sarvam 400'd, the API turned that into a 502, and
 *   `speakSmart` quietly fell back to the device engine. The symptom on the
 *   phone was "the server voice stopped working", with nothing in the app's own
 *   logs to say why.
 *
 * 480 rather than 500 leaves room for the sentence-boundary trim below.
 */
const SARVAM_MAX_CHARS = 480;

/**
 * Splits narration into pieces Sarvam will accept, breaking at sentence ends
 * so each chunk is a whole thought.
 *
 * ★ Boundaries include the Devanagari danda (`।`) as well as the full stop —
 *   Marathi and Hindi narration uses both, and splitting only on `.` would
 *   hand back one oversized chunk for a paragraph written with dandas.
 */
export function chunkForSarvam(
  text: string,
  max: number = SARVAM_MAX_CHARS,
  /**
   * Cap for the **first** chunk only.
   *
   * ★ Time-to-first-word is what a farmer experiences as "the delay". Synthesis
   *   time scales with input length, so a deliberately short opening chunk
   *   comes back sooner and the voice starts while the rest are still being
   *   made. The remaining chunks use the full limit, so this costs at most one
   *   extra request and buys roughly half the perceived wait.
   */
  firstMax: number = 180,
): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= firstMax) return [trimmed];

  // Keep the terminator attached to the sentence it ends.
  const sentences = trimmed.match(/[^.।?!]+[.।?!]*\s*/g) ?? [trimmed];
  const out: string[] = [];
  let current = '';

  for (const s of sentences) {
    // The first chunk gets the tighter cap; everything after uses the full one.
    const cap = out.length === 0 ? firstMax : max;
    if (current.length + s.length <= cap) {
      current += s;
      continue;
    }
    if (current.trim()) out.push(current.trim());
    if (s.length <= cap) {
      current = s;
      continue;
    }
    // A single sentence longer than the limit — rare, but it must not be
    // dropped. Break it on spaces rather than mid-word.
    current = '';
    let piece = '';
    for (const word of s.split(/\s+/)) {
      if (piece.length + word.length + 1 > cap) {
        if (piece.trim()) out.push(piece.trim());
        piece = word;
      } else {
        piece = piece ? `${piece} ${word}` : word;
      }
    }
    current = piece;
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(c => c.length > 0);
}

/**
 * Warms the cache for a narration the farmer has not asked for yet.
 *
 * ★ This is the real latency fix. Everything else — parallel chunks, a short
 *   opening chunk, the clip cache — shortens the wait *after* the tap. The
 *   wait itself is Sarvam synthesis plus a network round trip, and no amount
 *   of reordering removes it while it starts on the tap.
 *
 *   So do not start it on the tap. A screen knows what it would say the moment
 *   it renders; fetching the first chunk then means the audio is already on
 *   the device by the time a thumb reaches the button, and playback is
 *   immediate.
 *
 * ★ Only the **first** chunk. The rest stream in behind it while that one
 *   plays, so a farmer who never taps has cost one short request rather than a
 *   whole narration. Silent on failure — a warm-up that fails must never
 *   surface anything; the real tap will simply take its normal path.
 */
export async function prefetchNarration(text: string, locale: Locale = 'mr'): Promise<void> {
  if (!canPlaySarvam() || text.trim().length === 0) return;
  try {
    const first = chunkForSarvam(text)[0];
    if (first) await fetchSarvamClip(first, locale);
  } catch {
    // Warming is best-effort by definition.
  }
}

async function speakViaSarvam(
  narration: string,
  locale: Locale = 'mr',
  generation?: number,
): Promise<void> {
  const chunks = chunkForSarvam(narration);

  // ★ Every chunk starts synthesizing at once, but each is awaited **in turn**
  //   so playback begins the moment the *first* one lands.
  //
  //   This was `await Promise.all(...)` — which meant the farmer waited for the
  //   slowest chunk before hearing a single word. On a two-chunk narration that
  //   is roughly double the necessary delay, and it got worse the more the
  //   narration explained. The requests still overlap; only the waiting changed.
  const pending = chunks.map(c => fetchSarvamClip(c, locale));

  for (const p of pending) {
    const audio = await p;
    // The farmer pressed stop while this was still coming down the wire.
    if (generation !== undefined && generation !== speechGeneration) return;
    await playSarvamClip(audio, generation);
  }
}

/**
 * Synthesized audio we already have, keyed by exactly what produced it.
 *
 * ★ Why cache at all: a farmer taps Listen, hears the first sentence, taps it
 *   again — and every screen's narration is the same text until the underlying
 *   data changes. Without this, each tap is a fresh round trip to Sarvam for a
 *   clip we just had. With it, a repeat is instant and costs no quota.
 *
 * ★ Keyed on speaker and pace as well as text and locale, so switching voice
 *   or speed in settings does not replay the old voice from cache.
 */
const sarvamCache = new Map<string, string>();
/** Bounded so a long session cannot grow this without limit; base64 WAV is
 *  ~250KB a clip, so a few dozen is already a lot of memory. */
const SARVAM_CACHE_MAX = 24;

async function fetchSarvamClip(text: string, locale: Locale): Promise<string> {
  const speaker = getSarvamSpeaker();
  const pace = getSarvamPace();
  const key = `${locale}|${speaker}|${pace}|${text}`;

  const hit = sarvamCache.get(key);
  if (hit !== undefined) {
    // Refresh recency — Map preserves insertion order, so re-inserting moves
    // this to the end and keeps the eviction below approximately LRU.
    sarvamCache.delete(key);
    sarvamCache.set(key, hit);
    return hit;
  }

  const { audio_base64 } = await narrate(text, locale, speaker, pace);
  if (sarvamCache.size >= SARVAM_CACHE_MAX) {
    const oldest = sarvamCache.keys().next().value;
    if (oldest !== undefined) sarvamCache.delete(oldest);
  }
  sarvamCache.set(key, audio_base64);
  return audio_base64;
}

/** Writes one base64 WAV to the cache and plays it to completion. */
async function playSarvamClip(audio_base64: string, generation?: number): Promise<void> {
  // Decode the base64 WAV to bytes and park it in a temp cache file the
  // native player can read. CachesDirectory is sandboxed, app-owned, and
  // survives long enough for one playback.
  const RNFS = require('react-native-fs');
  const cacheDir: string = RNFS.CachesDirectoryPath;
  // ★ One file per utterance, not a single `sarvam_verdict.wav`. Two screens
  //   speaking in quick succession were writing over each other's audio
  //   mid-playback, which on Android is a truncated clip rather than an
  //   error — the voice simply stopped mid-sentence.
  // ★ A plain absolute path, with no `file://` scheme. That prefix was here
  //   for `AudioRecorderPlayer`; `react-native-sound` resolves an absolute
  //   path directly on Android and fails to load a `file://` URL, so adding it
  //   would swap one silent fallback for another.
  const filePath = `${cacheDir}/sarvam_${Date.now()}.wav`;
  await RNFS.writeFile(filePath, audio_base64, 'base64');
  if (generation !== undefined && generation !== speechGeneration) return;

  // ★ Played with `react-native-sound`, not `react-native-audio-recorder-player`.
  //
  //   This is the fix for "it only ever uses the fallback voice". The server
  //   was returning audio perfectly — 200s in the API log — but constructing
  //   `AudioRecorderPlayer` threw, because that native module is not in the
  //   installed APK. `speakSmart` caught the throw and fell back to the device
  //   engine, silently and every single time. `dumpsys audio` proved it: the
  //   active player was `com.google.android.tts`, never our own.
  //
  //   `canPlaySarvam()` only probed `react-native-fs`, so it happily reported
  //   the Sarvam path as available. Rather than add a second probe and keep a
  //   dependency this build does not carry, playback moves to
  //   `react-native-sound` — already imported at the top of this file for the
  //   pre-generated clips, already in the binary, and the library 12_STACK
  //   sanctions for exactly this.
  await new Promise<void>((resolve, reject) => {
    const sound = new Sound(filePath, '', error => {
      if (error) {
        reject(new Error(`Sarvam clip failed to load: ${error.message}`));
        return;
      }
      if (generation !== undefined && generation !== speechGeneration) {
        sound.release();
        resolve();
        return;
      }
      // Registered before playback starts so `stopSpeaking()` can reach it —
      // without this the Sarvam path was unstoppable and a farmer who tapped
      // stop heard the voice carry on.
      activePlayer = {
        stopPlayer: async () => {
          sound.stop();
          sound.release();
        },
        removePlayBackListener: () => {},
      };
      sound.play(() => {
        // Fires on natural end *and* on stop; both mean we are done with it.
        if (activePlayer !== null) activePlayer = null;
        sound.release();
        resolve();
      });
    });
  }).finally(() => {
    // Best effort — a stale cache file is harmless, a crash on cleanup is not.
    RNFS.unlink(filePath).catch(() => {});
  });
}

export async function speakVerdict(v: WindowRes, _t?: TFn): Promise<void> {
  if (v.action === 'NO_ADVICE') {
    await speak(['no_advice']);
    return;
  }

  const clips: string[] = [];

  // Action
  if (v.action === 'HOLD' && v.hold_days) {
    clips.push('hold', ...decomposeDays(v.hold_days));
  } else if (v.action === 'SELL_NOW') {
    clips.push('sell_now');
  } else if (v.action === 'SELL_ELSEWHERE') {
    clips.push('sell_elsewhere');
  } else if (v.action === 'SPLIT') {
    clips.push('split');
  }

  // Expected Gain
  if (v.expected_gain_paise !== null && v.expected_gain_paise !== undefined) {
    clips.push('exp_gain', ...decomposeRupees(v.expected_gain_paise));
  }

  // Worst Case (Loss)
  if (v.worst_case_paise !== null && v.worst_case_paise !== undefined) {
    clips.push('worst_case', ...decomposeRupees(v.worst_case_paise));
  }

  await speak(clips);
}

/** Every clip id this engine can ever ask for, and its Marathi text — for
 * `assets/audio/mr/README.md` and for anyone generating the actual clips.
 * Not used by playback itself (`speak` only ever needs the id). */
export function allClipTexts(): Record<string, string> {
  return { ...CLIP_TEXT_BY_ID };
}

