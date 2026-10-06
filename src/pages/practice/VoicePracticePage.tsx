import { useState } from 'react';
import { Mic, Pause, Play, Square, RotateCcw, ArrowRight, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Button, Badge } from '@/components/ui';
import { Waveform } from '@/components/shared/Waveform';
import { VoiceAnalysisResults } from '@/components/shared/VoiceAnalysisResults';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { practiceService, type VoiceAnalysisResult } from '@/services/practiceService';
import { useToast } from '@/hooks/useToast';
import { formatDuration } from '@/lib/utils';

const prompts = [
  'Describe a challenge you recently overcame and what you learned from it.',
  'Tell me about a time you worked effectively in a team.',
  'What are your greatest strengths as a communicator?',
];

export default function VoicePracticePage() {
  const recorder = useVoiceRecorder();
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);
  const [prompt] = useState(prompts[Math.floor(Math.random() * prompts.length)]);

  const isRecording = recorder.status === 'recording';
  const isPaused = recorder.status === 'paused';
  const isStopped = recorder.status === 'stopped';

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const audioBlob = await recorder.getAudioBlob();
    const analysis = await practiceService.analyzeVoiceRecording(recorder.duration, audioBlob ?? undefined);
    setResult(analysis);
    setAnalyzing(false);
  };

  const handleTryAgain = () => {
    recorder.reset();
    setResult(null);
  };

  const handleContinue = () => {
    showToast({ title: 'Great work!', description: 'Your learner profile has been updated.', variant: 'success' });
    handleTryAgain();
  };

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Voice Practice" description="Record a real answer and get instant AI feedback on fluency, pace and confidence." />

      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="accent">Speaking Prompt</Badge>
          {isRecording && <Badge variant="danger" className="animate-pulse-soft">● Recording</Badge>}
        </div>
        <p className="mt-3 text-lg font-medium text-base-50">{prompt}</p>
      </Card>

      <Card className="mt-6 flex flex-col items-center gap-6 p-8 sm:p-12">
        {recorder.error && (
          <div className="flex items-center gap-2 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300">
            <AlertCircle className="size-4.5 shrink-0" />
            {recorder.error}
          </div>
        )}

        <Waveform active={isRecording} bars={48} className="w-full max-w-lg" />

        <p className="font-display text-4xl font-semibold tabular-nums text-base-50">{formatDuration(recorder.duration)}</p>

        {!isStopped ? (
          <div className="flex items-center gap-4">
            {!isRecording && !isPaused && (
              <button
                onClick={recorder.start}
                aria-label="Start recording"
                className="flex size-20 items-center justify-center rounded-full bg-accent-500 text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95 focus-ring"
              >
                <Mic className="size-8" />
              </button>
            )}
            {isRecording && (
              <>
                <Button variant="secondary" size="icon" onClick={recorder.pause} aria-label="Pause recording">
                  <Pause className="size-5" />
                </Button>
                <button
                  onClick={recorder.stop}
                  aria-label="Stop recording"
                  className="flex size-20 items-center justify-center rounded-full bg-danger-500 text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95 focus-ring"
                >
                  <Square className="size-7" />
                </button>
              </>
            )}
            {isPaused && (
              <>
                <Button variant="secondary" size="icon" onClick={recorder.resume} aria-label="Resume recording">
                  <Play className="size-5" />
                </Button>
                <button
                  onClick={recorder.stop}
                  aria-label="Stop recording"
                  className="flex size-20 items-center justify-center rounded-full bg-danger-500 text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95 focus-ring"
                >
                  <Square className="size-7" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-4">
            {recorder.audioUrl && <audio controls src={recorder.audioUrl} className="w-full max-w-sm" />}
            {!result && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleTryAgain}>
                  <RotateCcw className="size-4" /> Try Again
                </Button>
                <Button onClick={handleAnalyze} loading={analyzing}>
                  View Detailed Feedback <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {result && (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-base-50">AI Communication Analysis</h3>
          <VoiceAnalysisResults result={result} />
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={handleTryAgain}>
              <RotateCcw className="size-4" /> Try Again
            </Button>
            <Button onClick={handleContinue}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
