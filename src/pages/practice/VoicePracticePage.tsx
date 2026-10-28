import { useState } from 'react';
import { Mic, Pause, Play, Square, RotateCcw, ArrowRight, AlertCircle, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
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
  'Tell me about a time you worked effectively in a multidisciplinary team.',
  'What are your greatest professional strengths, and how do you leverage them?',
  'Walk me through how you prioritize tasks when juggling multiple tight deadlines.',
  'Describe a situation where you had to persuade someone with a differing opinion.',
  'How do you handle constructive criticism or feedback from a mentor or manager?',
  'Tell me about a technical project that did not go as planned and how you adapted.',
  'Explain a complex concept simply as if explaining to a non-technical stakeholder.',
  'Where do you see yourself professionally in the next three to five years?',
  'Why are you passionate about your chosen career field and what drives your growth?',
];

export default function VoicePracticePage() {
  const recorder = useVoiceRecorder();
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const prompt = prompts[currentIndex];

  const handleNextPrompt = () => {
    setCurrentIndex((prev) => (prev + 1) % prompts.length);
    if (result) handleTryAgain();
  };

  const handlePrevPrompt = () => {
    setCurrentIndex((prev) => (prev - 1 + prompts.length) % prompts.length);
    if (result) handleTryAgain();
  };

  const handleShufflePrompt = () => {
    let nextIdx = Math.floor(Math.random() * prompts.length);
    if (nextIdx === currentIndex) nextIdx = (currentIndex + 1) % prompts.length;
    setCurrentIndex(nextIdx);
    if (result) handleTryAgain();
  };

  const isRecording = recorder.status === 'recording';
  const isPaused = recorder.status === 'paused';
  const isStopped = recorder.status === 'stopped';

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const audioBlob = await recorder.getAudioBlob();
    const transcript = await recorder.getTranscript();
    const analysis = await practiceService.analyzeVoiceRecording(recorder.duration, audioBlob ?? undefined, transcript, prompt);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="accent">Speaking Prompt</Badge>
            <span className="text-xs font-semibold text-base-400">
              Question {currentIndex + 1} of {prompts.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && <Badge variant="danger" className="animate-pulse-soft">● Recording</Badge>}
            <div className="flex items-center gap-1 border-l border-base-700/60 pl-3">
              <Button variant="ghost" size="icon" onClick={handlePrevPrompt} disabled={isRecording} title="Previous Question">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextPrompt} disabled={isRecording} title="Next Question">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShufflePrompt} disabled={isRecording} className="gap-1.5 text-xs">
                <Shuffle className="size-3.5" /> Random
              </Button>
            </div>
          </div>
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
        {!recorder.speechSupported && (
          <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-xs text-warning-300">
            This browser can't recognize speech while you talk. Your recording will still be analyzed, but transcription is less
            reliable — for the most accurate feedback use Chrome or Edge.
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
