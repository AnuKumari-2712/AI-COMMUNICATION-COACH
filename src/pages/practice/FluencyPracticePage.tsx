import { useEffect, useState } from 'react';
import {
  Mic,
  Square,
  RotateCcw,
  ArrowRight,
  Image as ImageIcon,
  MessageSquare,
  BookOpen,
  Shuffle,
  Clock,
  Target,
  Waves,
  AlertTriangle,
  Award,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Button } from '@/components/ui';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { Waveform } from '@/components/shared/Waveform';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { practiceService, type VoiceAnalysisResult } from '@/services/practiceService';
import { AnswerCorrectionBox } from '@/components/shared/AnswerCorrectionBox';
import { formatDuration, scoreTone } from '@/lib/utils';

export interface FluencyExercise {
  id: string;
  title: string;
  category: string;
  target: number;
  icon: typeof Clock;
  prompts: string[];
}

const exercises: FluencyExercise[] = [
  {
    id: 'speak30',
    title: 'Elevator Pitch Drill',
    category: 'Self Introduction',
    target: 30,
    icon: Clock,
    prompts: [
      'Introduce yourself to a VP of Engineering at a campus recruitment career fair.',
      'Deliver a 30-second introduction to a startup founder looking for an agile software engineer.',
      'Pitch your core skill set and problem-solving passion at an international hackathon opening circle.',
      'Summarize your transition from student learner to job-ready engineer in 30 seconds.',
      'Explain why you are the ideal candidate for an AI and Data Engineering internship in under half a minute.',
    ],
  },
  {
    id: 'image',
    title: 'Describe a Scene',
    category: 'Sensory Observation',
    target: 45,
    icon: ImageIcon,
    prompts: [
      'Describe a bustling modern tech conference: the sponsor booths, demo screens, attendee chatter, and electric energy.',
      'Describe the quiet, intense atmosphere of a computer lab at 2 AM during a university hackathon final sprint.',
      'Describe a high-tech corporate open-floor office: collaborative whiteboards, standing desks, coffee stations, and dual monitors.',
      'Describe an airport departure lounge during a rainy evening: travelers on laptops, flight announcements, and bustling café lines.',
      'Describe the view from the window of a high-speed bullet train traveling through countryside and modern city skylines.',
    ],
  },
  {
    id: 'topic',
    title: 'Explain a Concept Simply',
    category: 'Clarity & Teaching',
    target: 60,
    icon: MessageSquare,
    prompts: [
      'Explain how Cloud Computing works to a 10-year-old child using a real-world library or restaurant analogy.',
      'Explain what an Application Programming Interface (API) is to a non-technical marketing manager.',
      'Explain how Machine Learning learns from data compared to traditional rule-based coding.',
      'Explain why cyber security and strong passwords matter to someone who is not tech-savvy.',
      'Explain how a web browser loads a website when you type a URL, without using confusing jargon.',
    ],
  },
  {
    id: 'story',
    title: 'Storytelling Under Pressure',
    category: 'Narrative Arc',
    target: 60,
    icon: BookOpen,
    prompts: [
      'Narrate an unexpected turning point in a team project that saved it from total failure.',
      'Tell a story about a time you made a significant mistake in code or college and how you fixed it.',
      'Share a memorable personal journey or trip where things went completely off schedule.',
      'Describe a moment when you stepped outside your comfort zone to learn a difficult technology.',
      'Tell the story of how you and a teammate overcame a serious disagreement to deliver great work.',
    ],
  },
  {
    id: 'random',
    title: 'Impromptu Thought',
    category: 'Spontaneous Thinking',
    target: 45,
    icon: Shuffle,
    prompts: [
      'Speak continuously on: "Why consistency and daily practice beat natural talent every single time."',
      'Speak continuously on: "The ethical dilemmas of artificial intelligence making autonomous decisions."',
      'Speak continuously on: "Why failure in engineering is an essential stepping stone to innovation."',
      'Speak continuously on: "The impact of remote working on work-life balance and human communication."',
      'Speak continuously on: "If you had to live without technology for one month, how would your life change?"',
    ],
  },
  {
    id: 'persuade',
    title: 'The Persuasive Pitch',
    category: 'Influence & Conviction',
    target: 60,
    icon: Target,
    prompts: [
      'Convince your team lead to adopt automated CI/CD unit testing instead of relying on manual testing.',
      'Persuade senior stakeholders to allocate two weeks of sprint time to pay down technical debt and refactor legacy code.',
      'Convince a hiring manager that your problem-solving mindset makes up for lack of 5+ years of prior industry experience.',
      'Pitch a cloud migration strategy to a traditional company hesitant to move away from on-premise servers.',
      'Persuade your college department to introduce more hands-on open-source project building into the curriculum.',
    ],
  },
  {
    id: 'flow',
    title: 'Continuous Flow Drill',
    category: 'Filler Elimination',
    target: 45,
    icon: Waves,
    prompts: [
      'Describe your ideal collaborative workplace culture without pausing, hesitating, or using filler words.',
      'Detail your complete morning routine from waking up to sitting down at your desk without hesitation.',
      'Speak on the qualities of your favorite book, movie, or mentor with constant fluid momentum.',
      'Describe the evolution of smartphones over the last decade without using "um", "uh", or "like".',
      'Walk through why open-source software is the backbone of modern civilization in one continuous flow.',
    ],
  },
  {
    id: 'crisis',
    title: 'Crisis Communication',
    category: 'High-Pressure Composure',
    target: 60,
    icon: AlertTriangle,
    prompts: [
      'Calmly brief executive stakeholders during a critical live server outage that is impacting customer payments.',
      'Address frustrated team members after an important company deadline has been pushed up by three weeks.',
      'Explain to a client why their product feature will be delayed by one sprint while maintaining trust and transparency.',
      'Deliver a post-incident retro explanation of a major data bug without blaming individual developers.',
      'Reassure an anxious team member who feels overwhelmed and burned out during a crunch week.',
    ],
  },
  {
    id: 'leadership',
    title: 'Leadership & Ethics',
    category: 'Professional Integrity',
    target: 45,
    icon: Award,
    prompts: [
      'Discuss what qualities distinguish a truly inspiring engineering leader from a micromanager.',
      'Speak on how you would handle discovering a critical security flaw right before a major public product launch.',
      'Describe how empathy and active listening make someone a far more effective software engineer.',
      'Discuss the balance between delivering fast commercial features and preserving user data privacy.',
      'Explain why giving credit to your peers and junior teammates is essential for long-term leadership.',
    ],
  },
  {
    id: 'summary',
    title: 'Executive Project Summary',
    category: 'Concise Articulation',
    target: 60,
    icon: FileText,
    prompts: [
      'Deliver a structured 60-second executive summary of your flagship final year capstone project.',
      'Pitch a machine learning mobile application concept to venture capital investors in one minute.',
      'Summarize a full-stack web platform architecture, database choice, and deployment strategy succinctly.',
      'Explain the business value and return on investment (ROI) of a process automation tool you built.',
      'Summarize how your AI Communication Coach platform bridges the gap in placement preparation.',
    ],
  },
];

export default function FluencyPracticePage() {
  const [selected, setSelected] = useState(exercises[0]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const recorder = useVoiceRecorder();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);

  const currentPrompt = selected.prompts[scenarioIndex] || selected.prompts[0];

  useEffect(() => {
    if (recorder.status === 'recording' && recorder.duration >= selected.target) {
      recorder.stop();
    }
  }, [recorder, selected.target]);

  const handleSelectExercise = (ex: FluencyExercise) => {
    setSelected(ex);
    setScenarioIndex(0);
    handleReset();
  };

  const handleNextScenario = () => {
    setScenarioIndex((prev) => (prev + 1) % selected.prompts.length);
    handleReset();
  };

  const handlePrevScenario = () => {
    setScenarioIndex((prev) => (prev - 1 + selected.prompts.length) % selected.prompts.length);
    handleReset();
  };

  const handleShuffleScenario = () => {
    let nextIdx = Math.floor(Math.random() * selected.prompts.length);
    if (nextIdx === scenarioIndex) nextIdx = (scenarioIndex + 1) % selected.prompts.length;
    setScenarioIndex(nextIdx);
    handleReset();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const audioBlob = await recorder.getAudioBlob();
    const transcript = await recorder.getTranscript();
    const analysis = await practiceService.analyzeVoiceRecording(
      recorder.duration,
      audioBlob ?? undefined,
      transcript,
      currentPrompt,
    );
    setResult(analysis);
    setAnalyzing(false);
  };

  const handleReset = () => {
    recorder.reset();
    setResult(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Fluency Practice"
        description="Timed speaking drills with 5 distinct real-world situations per category to master speech pace, eliminate fillers, and build continuous momentum."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Exercises Category List */}
        <div className="space-y-2.5 lg:col-span-1">
          <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-base-400">
            <span>Drill Categories</span>
            <span>{exercises.length} Drills</span>
          </div>
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelectExercise(ex)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                selected.id === ex.id
                  ? 'border-accent-400 bg-accent-500/15 shadow-soft-sm'
                  : 'border-white/5 bg-base-900/60 hover:border-white/10 hover:bg-base-900/90'
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  selected.id === ex.id ? 'bg-accent-500 text-white' : 'bg-base-800 text-accent-400'
                }`}
              >
                <ex.icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-base-50">{ex.title}</p>
                <div className="flex items-center gap-2 text-xs text-base-400">
                  <span>{ex.target}s target</span>
                  <span>•</span>
                  <span className="text-accent-300/80">{ex.prompts.length} situations</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right Column: Drill & Situation Workspace */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="accent">{selected.title}</Badge>
                <Badge variant="outline" size="sm">
                  {selected.target} Seconds Goal
                </Badge>
              </div>

              {/* Scenario Switcher Controls */}
              <div className="flex items-center gap-1 border-l border-base-700/60 pl-3">
                <span className="mr-1 text-xs font-medium text-base-400">
                  Situation {scenarioIndex + 1} of {selected.prompts.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevScenario}
                  disabled={recorder.status === 'recording'}
                  title="Previous Situation"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextScenario}
                  disabled={recorder.status === 'recording'}
                  title="Next Situation"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffleScenario}
                  disabled={recorder.status === 'recording'}
                  className="gap-1 text-xs"
                >
                  <Shuffle className="size-3.5" /> Random
                </Button>
              </div>
            </div>

            {/* Scenario Pills Selector */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selected.prompts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setScenarioIndex(idx);
                    handleReset();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    scenarioIndex === idx
                      ? 'border border-accent-400/80 bg-accent-500/20 text-accent-200'
                      : 'border border-base-700/60 bg-base-950/40 text-base-400 hover:text-base-200'
                  }`}
                >
                  Situation {idx + 1}
                </button>
              ))}
            </div>

            {/* Situation Prompt Box */}
            <div className="mt-4 rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-300">
                <Sparkles className="size-3.5" />
                Current Speaking Prompt
              </div>
              <p className="mt-1.5 text-base font-medium leading-relaxed text-base-50">
                {currentPrompt}
              </p>
            </div>

            {/* Audio Recording & Waveform Zone */}
            <div className="mt-8 flex flex-col items-center gap-6">
              <Waveform active={recorder.status === 'recording'} bars={40} className="w-full max-w-md" />
              <div className="flex items-center gap-3">
                <p className="font-display text-3xl font-semibold tabular-nums text-base-50">
                  {formatDuration(recorder.duration)}
                </p>
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

          {/* Analysis Results Display */}
          {result && (
            <>
              <Card className="mt-6 p-6">
                <h3 className="mb-4 font-display text-base font-semibold text-base-50">Fluency Performance Report</h3>
                {result.source === 'mock' && (
                  <p className="mb-4 rounded-lg border border-warning-500/20 bg-warning-500/5 p-3 text-xs text-base-300">
                    {result.offline
                      ? 'Demo data — backend offline.'
                      : "Speech recognition couldn't transcribe this recording. For the most accurate feedback use Chrome or Edge closer to the microphone."}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="flex flex-col items-center gap-2">
                    <RadialProgress value={result.fluency} size={72} tone={scoreTone(result.fluency)} />
                    <span className="text-xs text-base-300">Fluency Score</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <RadialProgress value={result.pace} size={72} tone={scoreTone(result.pace)} />
                    <span className="text-xs text-base-300">Pace Control</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-display text-2xl font-semibold text-warning-400">
                      {result.fillerWordCount}
                    </span>
                    <span className="text-xs text-base-300">Filler Words</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-display text-2xl font-semibold text-accent-300">
                      {Math.round(result.wordsPerMinute)}
                    </span>
                    <span className="text-xs text-base-300">
                      Words / min {result.paceSource === 'measured' ? '(measured)' : '(estimated)'}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-base-500">
                  Comfortable range: {result.referenceRangeWpm} wpm.{' '}
                  {result.paceSource === 'measured'
                    ? 'Measured from real silence/pause energy analysis of your voice.'
                    : 'Estimated from your transcript.'}
                </p>
                <div className="mt-5 flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="size-4" /> Next Situation
                  </Button>
                </div>
              </Card>

              <div className="mt-6">
                <AnswerCorrectionBox
                  transcript={result.transcript}
                  correctedAnswer={result.correctedAnswer}
                  corrections={
                    result.corrections && result.corrections.length > 0
                      ? result.corrections
                      : (result.sentences || []).flatMap((s) =>
                          (s.mistakes || []).map((m) => ({
                            original: m.wrong,
                            corrected: m.correct,
                            reason: m.explanation,
                            errorType: m.type,
                            sentence: s.original,
                          }))
                        )
                  }
                  engine={result.grammarEngine || 'gemini'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
