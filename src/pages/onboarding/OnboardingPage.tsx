import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, ArrowLeft, Mic, FileText, Briefcase, BookOpen, SpellCheck, Waves, ShieldCheck, Loader2, PartyPopper,
} from 'lucide-react';
import { Button, Card, Input, Select } from '@/components/ui';
import { Stepper } from '@/components/shared/Stepper';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { CommunicationOrb } from '@/components/three/CommunicationOrb';
import { cn, scoreTone } from '@/lib/utils';
import { currentStudent } from '@/data/mockData';
import { practiceService } from '@/services/practiceService';
import { studentService } from '@/services/studentService';
import type { SkillScores, StudentProfile } from '@/types';

const steps = ['Personal Info', 'Goals', 'Career', 'Assessment', 'Your Profile'];

const goals = [
  { id: 'english', label: 'Improve English', icon: FileText },
  { id: 'interview', label: 'Interview Preparation', icon: Briefcase },
  { id: 'speaking', label: 'Public Speaking', icon: Mic },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'fluency', label: 'Fluency', icon: Waves },
  { id: 'grammar', label: 'Grammar', icon: SpellCheck },
  { id: 'confidence', label: 'Confidence', icon: ShieldCheck },
];

const careerGoals = ['Software Engineer', 'Data Analyst / Scientist', 'Product Manager', 'Consulting', 'Government Exams', 'Higher Studies'];

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => ({ label: y, value: y }));

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['interview', 'fluency']);
  const [careerGoal, setCareerGoal] = useState(careerGoals[0]);
  const [assessmentAnswer, setAssessmentAnswer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [finalScores, setFinalScores] = useState<SkillScores>(currentStudent.scores);
  const [personalInfo, setPersonalInfo] = useState<StudentProfile>(currentStudent);

  useEffect(() => {
    // Prefill step 1 with what was actually entered at signup, not the
    // "Ananya Sharma" demo profile — this only matters once the auth chain
    // has a real per-student profile to fetch (see src/services/authService.ts).
    studentService.getProfile().then(setPersonalInfo);
  }, []);

  const toggleGoal = (id: string) =>
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const next = async () => {
    if (step === 3) {
      setGenerating(true);
      const [scores] = await Promise.all([
        practiceService.runInitialAssessment(assessmentAnswer),
        new Promise((resolve) => setTimeout(resolve, 2200)), // keep the "analyzing" animation feeling substantial even when the API is fast
      ]);
      setFinalScores(scores);
      setGenerating(false);
      setProfileReady(true);
      setStep(4);
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-10 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-azure-500">
          <Sparkles className="size-4 text-white" />
        </div>
        <span className="font-display text-sm font-semibold text-base-50">Communication Coach</span>
      </div>

      {step < 4 && <Stepper steps={steps} current={step} />}

      <div className="mt-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepShell key="s0">
              <h2 className="font-display text-2xl font-semibold text-base-50">Tell us about yourself</h2>
              <p className="mt-1.5 text-sm text-base-300">This helps us tailor your learning experience.</p>
              <div key={personalInfo.email} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full Name" defaultValue={personalInfo.name} />
                <Input label="Email" defaultValue={personalInfo.email} type="email" disabled />
                <Input label="College / University" defaultValue={personalInfo.college} className="sm:col-span-2" />
                <Input label="Course" defaultValue={personalInfo.course} />
                <Select label="Year" options={yearOptions} defaultValue={personalInfo.year} />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell key="s1">
              <h2 className="font-display text-2xl font-semibold text-base-50">What's your communication goal?</h2>
              <p className="mt-1.5 text-sm text-base-300">Select all that apply — we'll prioritize these areas.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {goals.map((g) => {
                  const active = selectedGoals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 focus-ring',
                        active ? 'border-accent-400 bg-accent-500/10 text-accent-200' : 'border-base-600 bg-base-850 text-base-300 hover:border-base-500',
                      )}
                    >
                      <g.icon className="size-5" />
                      <span className="text-xs font-medium">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell key="s2">
              <h2 className="font-display text-2xl font-semibold text-base-50">What's your career goal?</h2>
              <p className="mt-1.5 text-sm text-base-300">We'll shape interview practice around this role.</p>
              <div className="mt-6 space-y-2.5">
                {careerGoals.map((g) => (
                  <button
                    key={g}
                    onClick={() => setCareerGoal(g)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors focus-ring',
                      careerGoal === g ? 'border-accent-400 bg-accent-500/10 text-accent-200' : 'border-base-600 bg-base-850 text-base-200 hover:border-base-500',
                    )}
                  >
                    {g}
                    {careerGoal === g && <span className="size-2 rounded-full bg-accent-400" />}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 3 && !generating && (
            <StepShell key="s3">
              <h2 className="font-display text-2xl font-semibold text-base-50">Quick communication assessment</h2>
              <p className="mt-1.5 text-sm text-base-300">Answer this prompt in your own words — it seeds your initial learner profile.</p>
              <Card className="mt-6 p-5">
                <p className="text-sm font-medium text-base-100">"Tell us about a challenge you recently overcame."</p>
                <textarea
                  value={assessmentAnswer}
                  onChange={(e) => setAssessmentAnswer(e.target.value)}
                  rows={6}
                  placeholder="Start typing your answer here, or imagine speaking it aloud..."
                  className="mt-4 w-full resize-none rounded-xl border border-base-600 bg-base-800/70 p-4 text-sm text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400"
                />
                <div className="mt-2 flex justify-between text-xs text-base-400">
                  <span>Minimum 20 words recommended</span>
                  <span>{assessmentAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </Card>
            </StepShell>
          )}

          {step === 3 && generating && (
            <StepShell key="s3-loading">
              <div className="flex flex-col items-center py-16 text-center">
                <Loader2 className="size-8 animate-spin text-accent-400" />
                <p className="mt-5 font-display text-lg font-semibold text-base-50">Analyzing your communication style...</p>
                <p className="mt-1.5 text-sm text-base-300">Scoring grammar, vocabulary, fluency and confidence.</p>
              </div>
            </StepShell>
          )}

          {step === 4 && profileReady && (
            <StepShell key="s4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-success-500/15 text-success-400">
                  <PartyPopper className="size-8" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-base-50">Your Personalized Learning Profile is Ready</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-base-300">
                  Based on your assessment, here's your starting point. Your plan will adapt as you practice.
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                <CommunicationOrb className="h-40 w-40" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Object.entries(finalScores)
                    .filter(([k]) => k !== 'overall')
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-col items-center gap-2">
                        <RadialProgress value={v} size={64} strokeWidth={6} tone={scoreTone(v)} />
                        <span className="text-center text-[11px] capitalize text-base-400">{k.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                </div>
              </div>
            </StepShell>
          )}
        </AnimatePresence>
      </div>

      {!generating && (
        <div className="mt-10 flex items-center justify-between">
          {step > 0 && step < 4 ? (
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <Button onClick={next} disabled={step === 3 && assessmentAnswer.trim().length < 5}>
              {step === 3 ? 'Generate My Profile' : 'Continue'} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button className="mx-auto" size="lg" onClick={() => navigate('/app/dashboard')}>
              Go to My Dashboard <ArrowRight className="size-4.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StepShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
