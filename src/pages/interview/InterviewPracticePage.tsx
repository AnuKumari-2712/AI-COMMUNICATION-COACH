import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Mic, Square, ArrowRight, Clock, HelpCircle, Gauge, MessageSquareText, ShieldCheck, Upload, FileText, Target, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Button, Modal, Input } from '@/components/ui';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Waveform } from '@/components/shared/Waveform';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useToast } from '@/hooks/useToast';
import { interviewService, type AnswerFeedback, type InterviewSession } from '@/services/interviewService';
import { AnswerCorrectionBox } from '@/components/shared/AnswerCorrectionBox';
import { formatDuration } from '@/lib/utils';
import type { InterviewCategory } from '@/types';

const difficultyTone = { Easy: 'success', Medium: 'warning', Hard: 'danger' } as const;

const defaultMetrics: AnswerFeedback = {
  grammar: 0, vocabulary: 0, fluency: 0, confidence: 0, clarity: 0, structure: 0, fillerWordCount: 0, feedback: '',
};

const commonRoles = ['Software Developer', 'Full Stack Developer', 'AI/ML Engineer', 'Data Analyst', 'Product Manager'];

export default function InterviewPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [active, setActive] = useState<InterviewCategory | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<AnswerFeedback>(defaultMetrics);
  const recorder = useVoiceRecorder();

  const [setupCategory, setSetupCategory] = useState<InterviewCategory | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobRole, setJobRole] = useState(commonRoles[0]);
  const [parsingResume, setParsingResume] = useState(false);
  const [startingSetup, setStartingSetup] = useState(false);

  useEffect(() => {
    interviewService.getCategories().then((cats) => {
      setCategories(cats);
      const state = location.state as { autoStartCategory?: string; prefilledResumeText?: string } | null;
      if (state?.autoStartCategory === 'resume' && state.prefilledResumeText) {
        const resumeCat = cats.find((c) => c.id === 'resume');
        if (resumeCat) {
          setResumeText(state.prefilledResumeText);
          beginSession(resumeCat, { resumeText: state.prefilledResumeText });
          showToast({
            title: 'Resume Interview Started',
            description: 'AI Interviewer has formulated questions directly from your analyzed resume.',
            variant: 'success',
          });
        }
      }
    });
  }, [location.state]);

  const beginSession = async (cat: InterviewCategory, options?: { resumeText?: string; jobRole?: string }) => {
    const newSession = await interviewService.startSession(cat.id, options);
    setSession(newSession);
    setActive(cat);
    setQIndex(0);
    setLastMetrics(defaultMetrics);
  };

  const startInterview = async (cat: InterviewCategory) => {
    if (cat.id === 'resume' || cat.id === 'job_role') {
      setSetupCategory(cat);
      return;
    }
    await beginSession(cat);
  };

  const handleResumeFile = async (file: File) => {
    setParsingResume(true);
    try {
      const text = await interviewService.uploadResume(file);
      setResumeText(text);
      showToast({ title: 'Resume parsed', description: 'Extracted text from your file.', variant: 'success' });
    } catch {
      showToast({ title: "Couldn't read that file", description: 'Paste your resume text instead.', variant: 'error' });
    } finally {
      setParsingResume(false);
    }
  };

  const confirmSetup = async () => {
    if (!setupCategory) return;
    setStartingSetup(true);
    if (setupCategory.id === 'resume') {
      await beginSession(setupCategory, { resumeText });
    } else {
      await beginSession(setupCategory, { jobRole });
    }
    setStartingSetup(false);
    setSetupCategory(null);
    setResumeText('');
  };

  const handleStop = async () => {
    recorder.stop();
  };

  const handleNext = async () => {
    if (!session) return;
    const question = session.questions[qIndex];

    setScoring(true);
    const audioBlob = await recorder.getAudioBlob();
    const transcript = await recorder.getTranscript();
    const feedback = await interviewService.answerQuestion(session, question.id, audioBlob ?? undefined, recorder.duration, transcript);
    setLastMetrics(feedback);
    setScoring(false);
    recorder.reset();

    let questionsList = session.questions;
    if (feedback.followupQuestion) {
      const followup = {
        id: feedback.followupQuestion.id,
        text: feedback.followupQuestion.text,
        isFollowup: true,
        engine: feedback.followupEngine,
      };
      if (!questionsList.some((q) => q.id === followup.id)) {
        questionsList = [...questionsList];
        questionsList.splice(qIndex + 1, 0, followup);
        setSession({ ...session, questions: questionsList });
      }
    }

    if (qIndex + 1 >= questionsList.length) {
      setSubmitting(true);
      const result = await interviewService.submitInterview(session);
      setSubmitting(false);
      navigate('/app/interview/result', { state: { result, categoryTitle: active!.title } });
      return;
    }
    setQIndex((i) => i + 1);
  };

  if (!active || !session) {
    return (
      <div>
        <PageHeader eyebrow="Practice" title="Interview Practice" description="Choose an interview type to start a realistic AI-driven mock interview." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id} interactive className="flex flex-col p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                  <Bot className="size-5" />
                </div>
                <Badge variant={difficultyTone[cat.difficulty]} size="sm">{cat.difficulty}</Badge>
              </div>
              <h3 className="font-display text-base font-semibold text-base-50">{cat.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-base-300">{cat.description}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-base-400">
                <span className="flex items-center gap-1"><HelpCircle className="size-3.5" /> {cat.questions} questions</span>
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> {cat.duration}</span>
              </div>
              <Button className="mt-5 w-full" onClick={() => startInterview(cat)}>
                Start Interview <ArrowRight className="size-4" />
              </Button>
            </Card>
          ))}
        </div>

        <Modal
          open={setupCategory?.id === 'resume'}
          onClose={() => setSetupCategory(null)}
          title="Resume-based Interview"
          description="Paste your resume text or upload a file — questions will be generated from your actual projects and skills."
          footer={
            <>
              <Button variant="ghost" onClick={() => setSetupCategory(null)}>Cancel</Button>
              <Button onClick={confirmSetup} loading={startingSetup} disabled={resumeText.trim().length < 20}>
                Generate Questions <ArrowRight className="size-4" />
              </Button>
            </>
          }
        >
          <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-base-500 bg-base-800/60 p-4 text-sm text-base-300 hover:border-accent-400 hover:text-base-100">
            <Upload className="size-4" />
            {parsingResume ? 'Reading file...' : 'Upload resume (PDF or .txt)'}
            <input
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleResumeFile(e.target.files[0])}
            />
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={8}
            placeholder="...or paste your resume text here (skills, projects, education)."
            className="w-full resize-none rounded-xl border border-base-600 bg-base-800/70 p-4 text-sm text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400"
          />
        </Modal>

        <Modal
          open={setupCategory?.id === 'job_role'}
          onClose={() => setSetupCategory(null)}
          title="Job-role based Interview"
          description="Pick (or type) the role you're targeting — questions will be tailored to it."
          footer={
            <>
              <Button variant="ghost" onClick={() => setSetupCategory(null)}>Cancel</Button>
              <Button onClick={confirmSetup} loading={startingSetup} disabled={!jobRole.trim()}>
                Generate Questions <ArrowRight className="size-4" />
              </Button>
            </>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {commonRoles.map((role) => (
              <button
                key={role}
                onClick={() => setJobRole(role)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  jobRole === role ? 'border-accent-400 bg-accent-500/10 text-accent-200' : 'border-base-600 text-base-300 hover:border-base-500'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <Input label="Target Role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} icon={<FileText className="size-4" />} />
        </Modal>
      </div>
    );
  }

  const question = session.questions[qIndex];

  return (
    <div>
      <PageHeader
        eyebrow={active.title}
        title={`Question ${qIndex + 1} of ${session.questions.length}`}
        description="Answer naturally — your response is analyzed for clarity, structure and confidence."
        actions={<DataSourceBadge source={session.source} />}
      />
      <ProgressBar value={qIndex} max={session.questions.length} tone="accent" className="mb-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-500/20 to-azure-500/20 text-accent-300">
              <Bot className="size-9" />
            </div>
            <p className="text-sm font-semibold text-base-50">AI Interviewer</p>
            {question.isFollowup ? (
              <div className="mt-1.5 flex flex-col items-center gap-1">
                <Badge variant="accent" size="sm" className="animate-pulse-soft">
                  Tailored Follow-up
                </Badge>
                <Badge variant="outline" size="sm" className="text-[10px]">
                  {question.engine === 'claude' ? 'Claude AI' : 'Heuristic Follow-up'}
                </Badge>
              </div>
            ) : (
              <Badge variant="accent" size="sm" className="mt-1.5">{active.title}</Badge>
            )}
            <p className="mt-5 text-sm leading-relaxed text-base-200">{question.text}</p>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-6 p-8">
          <Waveform active={recorder.status === 'recording'} bars={36} className="w-full" />
          <p className="font-display text-3xl font-semibold tabular-nums text-base-50">{formatDuration(recorder.duration)}</p>
          {recorder.status !== 'stopped' ? (
            recorder.status === 'recording' ? (
              <button onClick={handleStop} className="flex size-16 items-center justify-center rounded-full bg-danger-500 text-white shadow-soft-lg focus-ring" aria-label="Stop answer">
                <Square className="size-6" />
              </button>
            ) : (
              <button onClick={recorder.start} className="flex size-16 items-center justify-center rounded-full bg-accent-500 text-white shadow-soft-lg focus-ring" aria-label="Record answer">
                <Mic className="size-6" />
              </button>
            )
          ) : (
            <Button onClick={handleNext} loading={scoring || submitting}>
              {qIndex + 1 >= session.questions.length ? 'Finish Interview' : 'Next Question'} <ArrowRight className="size-4" />
            </Button>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-base-400">
            {lastMetrics.feedback ? 'Last Answer Metrics' : 'Live Metrics'}
          </p>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, label: 'Confidence', value: lastMetrics.confidence || 71, engine: undefined },
              { icon: Gauge, label: 'Fluency', value: lastMetrics.fluency || 64, engine: undefined },
              {
                icon: Target,
                label: 'Relevance',
                value: lastMetrics.relevanceScore !== undefined ? lastMetrics.relevanceScore : 75,
                engine: lastMetrics.relevanceEngine,
              },
              {
                icon: Sparkles,
                label: 'Vocabulary',
                value: lastMetrics.vocabulary || 70,
                engine: lastMetrics.vocabEngine,
              },
              { icon: MessageSquareText, label: 'Structure', value: lastMetrics.structure || 68, engine: undefined },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-base-300">
                  <span className="flex items-center gap-1.5">
                    <m.icon className="size-3.5 text-accent-400" /> {m.label}
                    {m.engine && (
                      <Badge variant={m.engine === 'claude' ? 'accent' : 'outline'} size="sm" className="text-[9px] py-0 px-1">
                        {m.engine === 'claude' ? 'Claude' : 'Heuristic'}
                      </Badge>
                    )}
                  </span>
                  <span className="font-medium text-base-100">{Math.round(m.value)}%</span>
                </div>
                <ProgressBar value={m.value} size="sm" tone="accent" />
              </div>
            ))}
            <div className="rounded-xl border border-white/5 bg-base-800/60 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-base-400">Filler words</p>
                <p className="font-display text-base font-semibold text-warning-400">{lastMetrics.fillerWordCount}</p>
              </div>
            </div>
            {lastMetrics.relevanceReason && (
              <div className="rounded-xl border border-white/5 bg-base-800/60 p-2.5 text-[11px] text-base-300">
                <strong className="text-accent-300">Relevance:</strong> {lastMetrics.relevanceReason}
              </div>
            )}
            {lastMetrics.feedback && (
              <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-2.5 text-xs text-base-300">
                {lastMetrics.feedback}
              </div>
            )}
            {lastMetrics.followupQuestion && (
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-300">Follow-up Generated</span>
                  <Badge variant={lastMetrics.followupEngine === 'claude' ? 'accent' : 'outline'} size="sm" className="text-[9px]">
                    {lastMetrics.followupEngine === 'claude' ? 'Claude AI' : 'Rule-based'}
                  </Badge>
                </div>
                <p className="text-xs text-base-100 italic">&ldquo;{lastMetrics.followupQuestion.text}&rdquo;</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Spoken Answer, Corrected Version, and Mistakes Box */}
      {(lastMetrics.transcript || lastMetrics.correctedAnswer || (lastMetrics.corrections && lastMetrics.corrections.length > 0)) && (
        <div className="mt-6">
          <AnswerCorrectionBox
            transcript={lastMetrics.transcript}
            correctedAnswer={lastMetrics.correctedAnswer}
            corrections={lastMetrics.corrections}
            engine="gemini"
          />
        </div>
      )}
    </div>
  );
}
