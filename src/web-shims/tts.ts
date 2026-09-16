/**
 * `react-native-tts` on the web, over the Web Speech API.
 *
 * This is the fallback voice, not the main one: `lib/voice.ts` tries Sarvam
 * first (a real Marathi voice from the server) and only lands here when that
 * fails. On the phone, "here" is the Android engine; in a browser it is
 * `speechSynthesis`, whose Marathi and Hindi coverage varies a lot by device.
 * `voices()` therefore reports honestly — if the browser has no voice for the
 * locale, `voice.ts` sees an empty list and clears its cached locale, exactly
 * as it does for an Android device with no Marathi pack installed.
 *
 * Two details the call site depends on:
 *
 *   - `speak()` returns an utterance id, and the finish event carries it back.
 *   - `addEventListener()` returns something with `.remove()`; `voice.ts`
 *     prefers that over `removeEventListener` (see its comment about the
 *     native module's own remove path).
 */

type TtsEvent = 'tts-start' | 'tts-finish' | 'tts-cancel' | 'tts-progress' | string;

interface Listener {
  event: TtsEvent;
  handler: (payload: { utteranceId: string }) => void;
}

const listeners: Listener[] = [];

let defaultLanguage = 'en-US';
let defaultRate = 1;
let defaultPitch = 1;
let defaultVoiceId: string | null = null;
let counter = 0;

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

function emit(event: TtsEvent, utteranceId: string): void {
  // Copied before iterating: a handler that removes itself while the finish
  // event is being delivered is the normal case here, not an edge case.
  listeners.slice().forEach(listener => {
    if (listener.event === event) listener.handler({ utteranceId });
  });
}

/**
 * Chrome populates the voice list asynchronously and returns `[]` on the
 * first call after a cold load. Waiting on `voiceschanged` once turns that
 * into a correct answer instead of "this browser has no voices".
 */
function allVoices(): Promise<SpeechSynthesisVoice[]> {
  const speech = synth();
  if (!speech) return Promise.resolve([]);

  const ready = speech.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise(resolve => {
    const done = () => {
      speech.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(speech.getVoices());
    };
    const timer = setTimeout(done, 1000);
    speech.addEventListener('voiceschanged', done);
  });
}

async function voices(): Promise<
  Array<{ id: string; name: string; language: string; quality?: number; notInstalled?: boolean }>
> {
  const list = await allVoices();
  return list.map(voice => ({
    id: voice.voiceURI,
    name: voice.name,
    language: voice.lang,
    // The web API exposes no quality score. `voice.ts` sorts by it and takes
    // the first usable entry, so a flat score just means "first match wins".
    quality: 300,
    notInstalled: false,
  }));
}

async function setDefaultLanguage(language: string): Promise<void> {
  defaultLanguage = language;
}

/**
 * `skipTransform` exists because Android scales the rate differently; the web
 * API takes a plain multiplier where 1 is normal, so the app's value is used
 * as-is, clamped to what browsers accept.
 */
async function setDefaultRate(rate: number, _skipTransform?: boolean): Promise<void> {
  defaultRate = Math.max(0.1, Math.min(10, rate));
}

async function setDefaultPitch(pitch: number): Promise<void> {
  defaultPitch = Math.max(0, Math.min(2, pitch));
}

async function setDefaultVoice(voiceId: string): Promise<void> {
  defaultVoiceId = voiceId;
}

function speak(text: string): string {
  const id = `web-utt-${++counter}`;
  const speech = synth();

  if (!speech) {
    // No engine at all. Report finish on the next tick so the caller's await
    // resolves instead of hanging on a promise nothing will settle.
    setTimeout(() => emit('tts-finish', id), 0);
    return id;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = defaultLanguage;
  utterance.rate = defaultRate;
  utterance.pitch = defaultPitch;

  if (defaultVoiceId) {
    const match = speech.getVoices().find(voice => voice.voiceURI === defaultVoiceId);
    if (match) utterance.voice = match;
  }

  utterance.onstart = () => emit('tts-start', id);
  utterance.onend = () => emit('tts-finish', id);
  // An error must also settle the caller, or a screen that failed to speak
  // leaves its Listen button stuck on "Playing…" forever.
  utterance.onerror = () => emit('tts-finish', id);

  speech.speak(utterance);
  return id;
}

async function stop(): Promise<void> {
  synth()?.cancel();
}

function addEventListener(
  event: TtsEvent,
  handler: (payload: { utteranceId: string }) => void,
): { remove: () => void } {
  const listener: Listener = { event, handler };
  listeners.push(listener);
  return {
    remove: () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    },
  };
}

function removeEventListener(
  event: TtsEvent,
  handler: (payload: { utteranceId: string }) => void,
): void {
  const index = listeners.findIndex(
    listener => listener.event === event && listener.handler === handler,
  );
  if (index >= 0) listeners.splice(index, 1);
}

export default {
  voices,
  setDefaultLanguage,
  setDefaultRate,
  setDefaultPitch,
  setDefaultVoice,
  speak,
  stop,
  addEventListener,
  removeEventListener,
  // Present on the native module; nothing in this app calls them, but a
  // missing method would be a runtime crash rather than a no-op.
  setDucking: async () => {},
  setIgnoreSilentSwitch: async () => {},
  getInitStatus: async () => 'success',
  requestInstallEngine: async () => {},
};
