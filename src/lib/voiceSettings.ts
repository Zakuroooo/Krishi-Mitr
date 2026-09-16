/**
 * The farmer's voice preferences, persisted across launches.
 *
 * ★ Why this exists: `S36_LanguageSwitcher` rendered a "voice assistance"
 *   toggle and three speed tabs that were `useState` and nothing else. Tapping
 *   them changed a colour and no behaviour — and they sat on the screen a
 *   farmer opens *because* he wants the app to talk to him. A control that
 *   lies about what it does is worse on that screen than anywhere else.
 *
 * ★ I first removed the speed tabs, claiming neither path exposed a rate.
 *   **That was wrong.** `react-native-tts` has `setDefaultRate`, and Sarvam's
 *   synthesis takes a `pace`. The tabs were dead because nothing was wired to
 *   them, not because the capability was missing. They are back and real: the
 *   rate applies to the on-device voice immediately, and the pace is sent to
 *   the server for the Sarvam voice.
 *
 * ★ `autoNarrate` defaults to **off**. Shipping it on was wrong — the phone
 *   started talking the instant a screen appeared, before you had looked at
 *   anything, and again every time you came back. But the setting itself is
 *   worth having: a farmer who cannot read at all wants exactly this, and he
 *   should be able to turn it on once and never hunt for the speaker again.
 *   Off by default, his to switch on.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTO_NARRATE_KEY = 'app.autoNarrate';
const VOICE_KEY = 'app.voice';
const SPEED_KEY = 'app.voiceSpeed';

/**
 * The voices a farmer can pick from, in the order they appear in settings.
 *
 * ★ Data-driven rather than a hardcoded male/female pair, because there are
 *   three of them now and there is no reason a fourth should mean touching the
 *   screen as well as this file. `S36_LanguageSwitcher` renders whatever is in
 *   this array.
 *
 * ★ `speaker` values must come from the roster of whichever `bulbul` model the
 *   server runs. I first used `anushka` / `abhilash` from **v2** and v3
 *   rejected both outright:
 *
 *       "Speaker 'anushka' is not compatible with model bulbul:v3"
 *
 *   v3's roster: aditya, ritu, ashutosh, priya, neha, rahul, pooja, rohan,
 *   simran, kavya, amit, dev, ishita, shreya, ratan, varun, manan, sumit,
 *   roopa, kabir, aayan, shubh, advait, anand, tanya, tarun. If the model is
 *   bumped again, this array is the only place to re-map.
 *
 * ★ All three below were checked against the live API: each returns a
 *   different audio stream for the same sentence, so the choice is real rather
 *   than three labels over one voice.
 */
export const VOICE_OPTIONS = [
  { id: 'female', speaker: 'simran', labelKey: 'lang_voice_female' },
  { id: 'male', speaker: 'shubh', labelKey: 'lang_voice_male' },
  { id: 'male_2', speaker: 'rohan', labelKey: 'lang_voice_male_2' },
] as const;

export type VoiceChoice = (typeof VOICE_OPTIONS)[number]['id'];

/** Lookup kept beside the array so neither can drift from the other. */
export const SARVAM_SPEAKER: Record<VoiceChoice, string> = VOICE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.speaker }),
  {} as Record<VoiceChoice, string>,
);

/**
 * How fast the app talks.
 *
 * ★ I removed the original speed tabs claiming neither TTS path exposed a
 *   rate. That was wrong: `react-native-tts` has `setDefaultRate`, and Sarvam
 *   takes a `pace`. The tabs were dead because nothing was wired to them, not
 *   because the capability was missing. They are back, and real.
 *
 * ★ **Normal means the engine's normal.** I first shifted every rate down a
 *   notch on the theory that a slower read is easier to follow by ear. On the
 *   device it was simply draggy, and the fallback voice became the most
 *   irritating thing in the app. A farmer who wants it slower has the slow tab.
 */
export type VoiceSpeed = 'slow' | 'normal' | 'fast';

/**
 * Rates handed to `Tts.setDefaultRate(rate, skipTransform = true)`.
 *
 * ★ `skipTransform: true` passes the number straight to Android's
 *   `TextToSpeech.setSpeechRate()`, where **1.0 is normal speed** — not 0.5.
 *   I had these on the library's transformed scale where 0.5 reads as normal,
 *   so every value was roughly half what it should have been and the fallback
 *   voice literally spoke at half speed. That is the whole "the voice is too
 *   slow and irritating" bug; it was arithmetic, not the engine.
 */
export const TTS_RATE: Record<VoiceSpeed, number> = {
  slow: 0.75,
  normal: 0.9,
  fast: 1.2,
};

/**
 * Sarvam `pace` — 1.0 is the voice as trained.
 *
 * ★ Normal is a true 1.0, not a slowed-down 0.9. The server voice at its own
 *   natural pace is the one people actually want to listen to; anything below
 *   it reads as sluggish rather than clear.
 */
export const SARVAM_PACE: Record<VoiceSpeed, number> = {
  slow: 0.6,
  normal: 1.0,
  fast: 1.15,
};

let voice: VoiceChoice = 'female';
let speed: VoiceSpeed = 'normal';

export function getVoice(): VoiceChoice {
  return voice;
}

export function getSpeed(): VoiceSpeed {
  return speed;
}

export function getTtsRate(): number {
  return TTS_RATE[speed];
}

export function getSarvamPace(): number {
  return SARVAM_PACE[speed];
}

export async function setSpeed(next: VoiceSpeed): Promise<void> {
  speed = next;
  try {
    await AsyncStorage.setItem(SPEED_KEY, next);
  } catch {
    // Holds for this session via the mirror above.
  }
}

export function getSarvamSpeaker(): string {
  return SARVAM_SPEAKER[voice];
}

/** Whether a screen reads itself aloud on arrival. Off unless he turns it on. */
let autoNarrate = false;

export function isAutoNarrateOn(): boolean {
  return autoNarrate;
}

export async function setAutoNarrate(on: boolean): Promise<void> {
  autoNarrate = on;
  try {
    await AsyncStorage.setItem(AUTO_NARRATE_KEY, on ? '1' : '0');
  } catch {
    // Holds for this session via the mirror above.
  }
}

export async function setVoice(next: VoiceChoice): Promise<void> {
  voice = next;
  try {
    await AsyncStorage.setItem(VOICE_KEY, next);
  } catch {
    // Holds for this session via the mirror above.
  }
}


/** Call once at startup, alongside the locale and token reads. */
export async function loadVoiceSettings(): Promise<void> {
  try {
    const [raw, rawVoice, rawSpeed] = await Promise.all([
      AsyncStorage.getItem(AUTO_NARRATE_KEY),
      AsyncStorage.getItem(VOICE_KEY),
      AsyncStorage.getItem(SPEED_KEY),
    ]);
    // Absent means never set, which is off — he opts in.
    autoNarrate = raw === '1';
    voice = VOICE_OPTIONS.some(o => o.id === rawVoice)
      ? (rawVoice as VoiceChoice)
      : 'female';
    speed = rawSpeed === 'slow' || rawSpeed === 'fast' ? rawSpeed : 'normal';
  } catch {
    autoNarrate = false;
    voice = 'female';
    speed = 'normal';
  }
}
