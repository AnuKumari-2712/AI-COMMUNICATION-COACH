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
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef<number>(0);
  const lastLevelValRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setLiveTranscript('');
    setAudioLevel(0);
    chunksRef.current = [];
    finalBlobRef.current = new Promise<Blob | null>((resolve) => {
      resolveFinalBlobRef.current = resolve;
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect Web Audio API Analyser for live mic volume metering with throttled state updates
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          lastLevelUpdateRef.current = 0;
          lastLevelValRef.current = 0;

          const updateLevel = (now: number) => {
            if (!analyserRef.current) return;
            // Throttle state update to at most once every 120ms to keep React 60fps smooth
            if (now - lastLevelUpdateRef.current >= 120) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i += 1) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const newLevel = Math.min(100, Math.round((avg / 128) * 100));
              if (Math.abs(newLevel - lastLevelValRef.current) >= 3 || newLevel === 0) {
                lastLevelValRef.current = newLevel;
                setAudioLevel(newLevel);
              }
              lastLevelUpdateRef.current = now;
            }
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          animFrameRef.current = requestAnimationFrame(updateLevel);
        }
      } catch {
        // AudioContext fallback if unavailable
      }

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
          })
          .finally(() => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close().catch(() => {});
              audioContextRef.current = null;
            }
          });
      };

      // Use 250ms timeslice to ensure continuous chunk capture
      recorder.start(250);
      transcriber.reset();
      transcriber.onTextChange = (text: string) => {
        setLiveTranscript(text);
      };
      transcriber.start();
      setStatus('recording');
      startTimeRef.current = Date.now();
      setDuration(1);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        setDuration(elapsed);
      }, 1000);
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
      setAudioLevel(0);
    }
  }, [transcriber]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      transcriber.start();
      setStatus('recording');
      intervalRef.current = setInterval(() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        setDuration(elapsed);
      }, 1000);
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateLevel = (now: number) => {
          if (!analyserRef.current) return;
          if (now - lastLevelUpdateRef.current >= 120) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i += 1) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const newLevel = Math.min(100, Math.round((avg / 128) * 100));
            if (Math.abs(newLevel - lastLevelValRef.current) >= 3 || newLevel === 0) {
              lastLevelValRef.current = newLevel;
              setAudioLevel(newLevel);
            }
            lastLevelUpdateRef.current = now;
          }
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
    }
  }, [transcriber]);

  const stop = useCallback(() => {
    const finalDur = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    setDuration(finalDur);
    finalTranscriptRef.current = transcriber.stop();
    clearTimer();
    setAudioLevel(0);
    analyserRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
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
    setAudioLevel(0);
    setLiveTranscript('');
    finalBlobRef.current = Promise.resolve(null);
    clearTimer();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, [transcriber]);

  const getAudioBlob = useCallback(() => finalBlobRef.current, []);
  /** Resolves with what the browser recognized (empty if unsupported or nothing was heard). */
  const getTranscript = useCallback(() => finalTranscriptRef.current, []);

  useEffect(() => () => {
    clearTimer();
    transcriber.reset();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  }, [transcriber]);

  // Derived real-time speech stats
  const liveWordCount = liveTranscript.trim() ? liveTranscript.trim().split(/\s+/).length : 0;
  const liveWpm = duration > 0 ? Math.round((liveWordCount / duration) * 60) : 0;
  const liveFillerMatches = liveTranscript.match(/\b(um|uh|umm|uhh|hmm|erm|like|actually|basically|you know|sort of|kind of)\b/gi);
  const liveFillerCount = liveFillerMatches ? liveFillerMatches.length : 0;

  return {
    status,
    duration,
    audioUrl,
    audioBlob,
    audioLevel,
    liveTranscript,
    liveWordCount,
    liveWpm,
    liveFillerCount,
    getAudioBlob,
    getTranscript,
    speechSupported,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
