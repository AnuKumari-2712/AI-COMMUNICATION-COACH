import { useCallback, useEffect, useRef, useState } from 'react';
import { blobToWav } from '@/lib/audioToWav';
import { LiveTranscriber } from '@/lib/liveTranscriber';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

export function useVoiceRecorder() {
  // Recognizes the speech in the browser while recording; the text is sent to
  // the backend with the audio (see lib/liveTranscriber.ts for why).
  const [transcriber] = useState(() => new LiveTranscriber());
  const finalTranscriptRef = useRef<Promise<string>>(Promise.resolve(''));
  const speechSupported = LiveTranscriber.isSupported();

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Resolves with the WAV (or, if conversion fails, the raw recording) once the
  // recorder has stopped and conversion has finished. Callers must await this
  // instead of reading audioBlob immediately after stop(), or they can upload
  // nothing and silently fall back to demo data.
  const finalBlobRef = useRef<Promise<Blob | null>>(Promise.resolve(null));
  const resolveFinalBlobRef = useRef<((blob: Blob | null) => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const raw = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(raw)); // playback uses the original recording
        streamRef.current?.getTracks().forEach((t) => t.stop());
        // Upload uses 16 kHz mono WAV so the backend can really transcribe it.
        blobToWav(raw)
          .catch(() => raw) // can't decode here -> send the original; the backend will label its fallback
          .then((finalBlob) => {
            setAudioBlob(finalBlob);
            resolveFinalBlobRef.current?.(finalBlob);
          });
      };
      recorder.start();
      transcriber.reset();
      transcriber.start();
      setStatus('recording');
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setStatus('error');
      setError('Microphone access was denied or is unavailable. Please allow microphone permissions.');
    }
  }, [transcriber]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      transcriber.pause();
      setStatus('paused');
      clearTimer();
    }
  }, [transcriber]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      transcriber.start();
      setStatus('recording');
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  }, [transcriber]);

  const stop = useCallback(() => {
    finalBlobRef.current = new Promise<Blob | null>((resolve) => {
      resolveFinalBlobRef.current = resolve;
    });
    finalTranscriptRef.current = transcriber.stop();
    mediaRecorderRef.current?.stop();
    clearTimer();
    setStatus('stopped');
  }, [transcriber]);

  const reset = useCallback(() => {
    transcriber.reset();
    finalTranscriptRef.current = Promise.resolve('');
    setStatus('idle');
    setDuration(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setError(null);
    finalBlobRef.current = Promise.resolve(null);
    clearTimer();
  }, [transcriber]);

  const getAudioBlob = useCallback(() => finalBlobRef.current, []);
  /** Resolves with what the browser recognized (empty if unsupported or nothing was heard). */
  const getTranscript = useCallback(() => finalTranscriptRef.current, []);

  useEffect(() => () => {
    clearTimer();
    transcriber.reset();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [transcriber]);

  return { status, duration, audioUrl, audioBlob, getAudioBlob, getTranscript, speechSupported, error, start, pause, resume, stop, reset };
}
