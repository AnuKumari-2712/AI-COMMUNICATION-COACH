/**
 * Speech recognition that runs in the user's own browser (Chrome / Edge expose
 * it as SpeechRecognition / webkitSpeechRecognition). The transcript is sent to
 * the backend alongside the recorded audio.
 *
 * Why not rely on the server alone: the backend's free Google request returned
 * only the tail of longer clips when called from the deployed host, for audio
 * that transcribed completely elsewhere. Recognizing in the browser goes out over
 * the user's own connection and also sees the whole utterance.
 *
 * Browsers without the API (Firefox) simply report unsupported and the backend's
 * own recognition is used as before.
 */
interface RecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANGUAGE = 'en-IN';
const STOP_WAIT_MS = 2000;
// Chrome ends a session by itself after a stretch of silence; we reopen it while
// recording, but give up if it keeps failing immediately (e.g. permission denied).
const MAX_QUICK_RESTARTS = 5;

export class LiveTranscriber {
  static isSupported(): boolean {
    return recognitionConstructor() !== null;
  }

  private recognition: Recognition | null = null;
  private finals = '';
  private interim = '';
  private listening = false;
  private waiting: (() => void) | null = null;
  private lastOpenedAt = 0;
  private quickRestarts = 0;

  /** Starts (or resumes) listening. Text recognized so far is kept. */
  start(): void {
    const Ctor = recognitionConstructor();
    if (!Ctor || this.listening) return;
    this.listening = true;
    this.quickRestarts = 0;
    this.open(Ctor);
  }

  /** Stops listening but keeps the text, so a paused recording can resume. */
  pause(): void {
    this.listening = false;
    try {
      this.recognition?.stop();
    } catch {
      /* already stopped */
    }
  }

  /** Stops listening and resolves with everything recognized. */
  stop(): Promise<string> {
    this.listening = false;
    const recognition = this.recognition;
    if (!recognition) return Promise.resolve(this.text());
    return new Promise<string>((resolve) => {
      const finish = () => {
        this.waiting = null;
        resolve(this.text());
      };
      this.waiting = finish;
      try {
        recognition.stop();
      } catch {
        finish();
      }
      setTimeout(() => this.waiting?.(), STOP_WAIT_MS);
    });
  }

  reset(): void {
    this.listening = false;
    try {
      this.recognition?.abort();
    } catch {
      /* already stopped */
    }
    this.recognition = null;
    this.finals = '';
    this.interim = '';
    this.waiting = null;
  }

  private text(): string {
    return `${this.finals} ${this.interim}`.replace(/\s+/g, ' ').trim();
  }

  private commitInterim() {
    if (this.interim.trim()) this.finals += `${this.interim.trim()} `;
    this.interim = '';
  }

  private open(Ctor: RecognitionConstructor) {
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) this.finals += `${result[0].transcript.trim()} `;
        else interim += result[0].transcript;
      }
      this.interim = interim;
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') this.listening = false;
    };
    recognition.onend = () => {
      this.commitInterim();
      this.recognition = null;
      if (this.listening) {
        this.quickRestarts = Date.now() - this.lastOpenedAt < 1000 ? this.quickRestarts + 1 : 0;
        if (this.quickRestarts < MAX_QUICK_RESTARTS) {
          this.open(Ctor);
          return;
        }
        this.listening = false;
      }
      this.waiting?.();
    };

    this.recognition = recognition;
    this.lastOpenedAt = Date.now();
    try {
      recognition.start();
    } catch {
      this.recognition = null;
      this.listening = false;
    }
  }
}
