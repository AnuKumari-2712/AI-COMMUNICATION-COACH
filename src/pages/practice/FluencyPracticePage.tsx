import { useEffect, useState } from 'react';
import { Mic, Square, RotateCcw, ArrowRight, Image as ImageIcon, MessageSquare, BookOpen, Shuffle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Button } from '@/components/ui';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { Waveform } from '@/components/shared/Waveform';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { practiceService, type VoiceAnalysisResult } from '@/services/practiceService';
import { formatDuration, scoreTone } from '@/lib/utils';

const exercises = [
  { id: 'speak30', title: 'Speak for 30 Seconds', description: 'Talk continuously about your favorite hobby.', icon: Clock, target: 30 },
  { id: 'image', title: 'Describe an Image', description: 'Describe what a busy city street might look like.', icon: ImageIcon, target: 45 },
  { id: 'topic', title: 'Explain a Topic', description: 'Explain how the internet works, in simple terms.', icon: MessageSquare, target: 60 },
  { id: 'story', title: 'Storytelling', description: 'Tell a short story about an unexpected trip.', icon: BookOpen, target: 60 },
  { id: 'random', title: 'Random Topic', description: 'Speak about: "The importance of lifelong learning."', icon: Shuffle, target: 45 },
];

export default function FluencyPracticePage() {
  const [selected, setSelected] = useState(exercises[0]);
  const recorder = useVoiceRecorder();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);

  useEffect(() => {
    if (recorder.status === 'recording' && recorder.duration >= selected.target) {
      recorder.stop();
    }
  }, [recorder, selected.target]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const audioBlob = await recorder.getAudioBlob();
    const transcript = await recorder.getTranscript();
    const analysis = await practiceService.analyzeVoiceRecording(recorder.duration, audioBlob ?? undefined, transcript);
    setResult(analysis);
    setAnalyzing(false);
  };

  const handleReset = () => {
    recorder.reset();
    setResult(null);
  };

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Fluency Practice" description="Timed speaking drills that target pauses, pace and filler words." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setSelected(ex);
                handleReset();
              }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                selected.id === ex.id ? 'border-accent-400 bg-accent-500/10' : 'border-white/5 bg-base-850 hover:border-white/10'
              }`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
                <ex.icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-base-50">{ex.title}</p>
                <p className="text-xs text-base-400">{ex.target}s target</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <Badge variant="accent" className="mb-3">{selected.title}</Badge>
            <p className="text-base font-medium text-base-50">{selected.description}</p>

            <div className="mt-8 flex flex-col items-center gap-6">
              <Waveform active={recorder.status === 'recording'} bars={40} className="w-full max-w-md" />
              <div className="flex items-center gap-3">
                <p className="font-display text-3xl font-semibold tabular-nums text-base-50">{formatDuration(recorder.duration)}</p>
                <span className="text-sm text-base-400">/ {formatDuration(selected.target)}</span>
              </div>

              {recorder.status !== 'stopped' ? (
                recorder.status === 'recording' ? (
                  <button
                    onClick={recorder.stop}
                    className="flex size-16 items-center justify-center rounded-full bg-danger-500 text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95 focus-ring"
                    aria-label="Stop recording"
                  >
                    <Square className="size-6" />
                  </button>
                ) : (
                  <button
                    onClick={recorder.start}
                    className="flex size-16 items-center justify-center rounded-full bg-accent-500 text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95 focus-ring"
                    aria-label="Start recording"
                  >
                    <Mic className="size-6" />
                  </button>
                )
              ) : !result ? (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="size-4" /> Try Again
                  </Button>
                  <Button onClick={handleAnalyze} loading={analyzing}>
                    Analyze Fluency <ArrowRight className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>

          {result && (
            <Card className="mt-6 p-6">
              <h3 className="mb-4 font-display text-base font-semibold text-base-50">Fluency Report</h3>
              {result.source === 'mock' && (
                <p className="mb-4 rounded-lg border border-warning-500/20 bg-warning-500/5 p-3 text-xs text-base-300">
                  {result.offline
                    ? 'Demo data — backend offline.'
                    : "Speech recognition couldn't transcribe this recording, so these numbers are based on a sample sentence, not what you said. Try again closer to the microphone."}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex flex-col items-center gap-2">
                  <RadialProgress value={result.fluency} size={72} tone={scoreTone(result.fluency)} />
                  <span className="text-xs text-base-300">Fluency</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <RadialProgress value={result.pace} size={72} tone={scoreTone(result.pace)} />
                  <span className="text-xs text-base-300">Pace Control</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="font-display text-2xl font-semibold text-warning-400">{result.fillerWordCount}</span>
                  <span className="text-xs text-base-300">Filler Words</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="font-display text-2xl font-semibold text-accent-300">{Math.round(result.wordsPerMinute)}</span>
                  <span className="text-xs text-base-300">
                    Words / min {result.paceSource === 'measured' ? '(measured)' : '(estimated)'}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-base-500">
                Comfortable range: {result.referenceRangeWpm} wpm.{' '}
                {result.paceSource === 'measured'
                  ? 'Measured from real pause/silence analysis of your recording.'
                  : 'Estimated from your transcript — upload real WAV audio for a measured pace.'}
              </p>
              <div className="mt-5 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="size-4" /> Practice Another
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
