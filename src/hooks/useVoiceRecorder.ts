import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setAudioBlob(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setStatus('recording');
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setStatus('error');
      setError('Microphone access was denied or is unavailable. Please allow microphone permissions.');
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      clearTimer();
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  }, []);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    clearTimer();
    setStatus('stopped');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setDuration(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setError(null);
    clearTimer();
  }, []);

  useEffect(() => () => {
    clearTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { status, duration, audioUrl, audioBlob, error, start, pause, resume, stop, reset };
}
