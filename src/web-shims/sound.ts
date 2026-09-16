/**
 * `react-native-sound` on the web, over `HTMLAudioElement`.
 *
 * Two kinds of source reach this class, and they arrive as strings that look
 * alike but are not:
 *
 *   1. A bundled clip id — `new Sound('verdict_hold.mp3', Sound.MAIN_BUNDLE, cb)`.
 *      Those files are Android assets; there is no such thing here. The
 *      callback gets an error, `loadClip()` in `lib/voice.ts` resolves `null`,
 *      and the caller falls through to the speech path. That is the same code
 *      path a phone with a missing clip takes, so nothing special happens.
 *
 *   2. A path written moments earlier by `RNFS.writeFile` — the Sarvam voice
 *      path. `web-shims/fs.ts` keeps those in memory as data URLs, so the
 *      lookup below finds one and plays it.
 */

import { readFileUrl } from './fs';

type LoadCallback = (error: { message: string } | null) => void;

export default class Sound {
  /** Kept for API shape; a bundle lookup always misses on the web. */
  static MAIN_BUNDLE = 'MAIN_BUNDLE';
  static DOCUMENT = 'DOCUMENT';
  static LIBRARY = 'LIBRARY';
  static CACHES = 'CACHES';

  /** A no-op here. On Android it is what makes audio play through the
   *  speaker when the phone is on vibrate; the browser has no such switch. */
  static setCategory(_category: string, _mixWithOthers?: boolean): void {}

  private audio: HTMLAudioElement | null = null;
  private onEnd: (() => void) | null = null;

  constructor(source: string, basePath: string, onLoad: LoadCallback) {
    const url = basePath === Sound.MAIN_BUNDLE ? null : readFileUrl(source) ?? source;

    if (!url) {
      // Deliberately asynchronous: the real library never calls back
      // synchronously, and `loadClip()` stores into a Map after constructing.
      setTimeout(() => onLoad({ message: `not available on web: ${source}` }), 0);
      return;
    }

    const audio = new Audio(url);
    this.audio = audio;

    audio.addEventListener('ended', () => {
      const cb = this.onEnd;
      this.onEnd = null;
      if (cb) cb();
    });

    const fail = () =>
      onLoad({ message: `could not decode audio: ${source.slice(0, 40)}` });

    // `canplaythrough` rather than `loadeddata`: the caller treats the
    // callback as "ready to play", and a partial buffer is not.
    audio.addEventListener('canplaythrough', () => onLoad(null), { once: true });
    audio.addEventListener('error', fail, { once: true });
    audio.load();
  }

  play(onDone?: () => void): void {
    if (!this.audio) {
      if (onDone) onDone();
      return;
    }
    this.onEnd = onDone ?? null;
    void this.audio.play().catch(() => {
      // Autoplay policy, most likely: the browser refuses audio that no
      // gesture asked for. Report completion rather than hanging the queue —
      // every Listen button in this app is already behind a tap, so this is
      // the rare case, not the common one.
      const cb = this.onEnd;
      this.onEnd = null;
      if (cb) cb();
    });
  }

  stop(onDone?: () => void): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    // Matches the native behaviour: a stopped sound does not fire its play
    // callback, so drop it rather than resolving twice.
    this.onEnd = null;
    if (onDone) onDone();
  }

  pause(onDone?: () => void): void {
    this.audio?.pause();
    if (onDone) onDone();
  }

  release(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.onEnd = null;
  }

  setVolume(value: number): this {
    if (this.audio) this.audio.volume = Math.max(0, Math.min(1, value));
    return this;
  }

  setSpeed(value: number): this {
    if (this.audio) this.audio.playbackRate = value;
    return this;
  }

  getDuration(): number {
    return this.audio?.duration ?? -1;
  }

  isLoaded(): boolean {
    return this.audio !== null;
  }
}
