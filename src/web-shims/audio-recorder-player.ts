/**
 * `react-native-audio-recorder-player` on the web, over `MediaRecorder`.
 *
 * Only `VoiceMic` uses this, and only to record until the farmer taps again,
 * then hand the recording to `POST /voice/transcribe`. So the surface here is
 * the four calls that flow takes — start, stop, and the two listener methods —
 * plus the Android enum objects the call site imports for its `AUDIO_SET`
 * (meaningless in a browser, kept so the import resolves).
 *
 * `stopRecorder()` returns a `blob:` URL. On the phone it returns a file path,
 * and `transcribeAudio()` puts whichever string it gets into a multipart body.
 */

export const AudioEncoderAndroidType = {
  DEFAULT: 0,
  AMR_NB: 1,
  AMR_WB: 2,
  AAC: 3,
  HE_AAC: 4,
  AAC_ELD: 5,
  VORBIS: 6,
} as const;

export const AudioSourceAndroidType = {
  DEFAULT: 0,
  MIC: 1,
  VOICE_UPLINK: 2,
  VOICE_DOWNLINK: 3,
  VOICE_CALL: 4,
  CAMCORDER: 5,
  VOICE_RECOGNITION: 6,
  VOICE_COMMUNICATION: 7,
} as const;

export const OutputFormatAndroidType = {
  DEFAULT: 0,
  THREE_GPP: 1,
  MPEG_4: 2,
  AMR_NB: 3,
  AMR_WB: 4,
  AAC_ADIF: 5,
  AAC_ADTS: 6,
} as const;

export const AVEncoderAudioQualityIOSType = { min: 0, low: 32, medium: 64, high: 96, max: 127 };
export const AVEncodingOption = { m4a: 'm4a', aac: 'aac', wav: 'wav' };

interface RecordBackType {
  isRecording: boolean;
  currentPosition: number;
  currentMetering?: number;
}

/** The first mime type the browser will actually record in. Safari records
 *  mp4/aac, Chrome and Firefox record webm/opus; the server is told which by
 *  the blob's own type. */
function pickMimeType(): string | undefined {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  const supported =
    typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function';
  if (!supported) return undefined;
  return candidates.find(type => MediaRecorder.isTypeSupported(type));
}

export default class AudioRecorderPlayer {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private listener: ((e: RecordBackType) => void) | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private lastUrl: string | null = null;
  private player: HTMLAudioElement | null = null;

  async startRecorder(_uri?: string, _audioSets?: unknown): Promise<string> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      // Thrown, not swallowed: `VoiceMic` catches this and shows its error
      // state with the type-instead fallback, which is the honest outcome on
      // a browser that cannot record.
      throw new Error('recording is not supported in this browser');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.addEventListener('dataavailable', event => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.start();
    this.startedAt = Date.now();

    this.ticker = setInterval(() => {
      if (this.listener) {
        this.listener({ isRecording: true, currentPosition: Date.now() - this.startedAt });
      }
    }, 200);

    return 'web-recording';
  }

  stopRecorder(): Promise<string> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error('no recording in progress'));
        return;
      }

      recorder.addEventListener(
        'stop',
        () => {
          const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
          // Releasing the tracks is what turns the browser's recording
          // indicator off. Leaving them live reads, correctly, as the site
          // still listening.
          this.stream?.getTracks().forEach(track => track.stop());
          this.stream = null;
          this.recorder = null;
          if (this.ticker) {
            clearInterval(this.ticker);
            this.ticker = null;
          }
          if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
          this.lastUrl = URL.createObjectURL(blob);
          resolve(this.lastUrl);
        },
        { once: true },
      );

      recorder.stop();
    });
  }

  addRecordBackListener(callback: (e: RecordBackType) => void): void {
    this.listener = callback;
  }

  removeRecordBackListener(): void {
    this.listener = null;
  }

  async startPlayer(uri?: string): Promise<string> {
    const src = uri ?? this.lastUrl;
    if (!src) throw new Error('nothing to play');
    this.player = new Audio(src);
    await this.player.play();
    return src;
  }

  async stopPlayer(): Promise<string> {
    this.player?.pause();
    this.player = null;
    return 'stopped';
  }

  addPlayBackListener(_callback: (e: unknown) => void): void {}
  removePlayBackListener(): void {}

  mmssss(ms: number): string {
    const total = Math.floor(ms / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }
}
