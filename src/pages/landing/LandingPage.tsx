import { useNavigate } from 'react-router-dom';
import {
  Mic, FileText, Brain, Target, LineChart, Bot, Briefcase, Sparkles, ArrowRight,
  BookOpen, Gauge, ShieldCheck, Star, CheckCircle2,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { CommunicationOrb } from '@/components/three/CommunicationOrb';
import { ParticleField } from '@/components/three/ParticleField';
import { Waveform } from '@/components/shared/Waveform';
import { Reveal } from '@/components/shared/Reveal';
import { Accordion } from '@/components/shared/Accordion';
import { testimonials } from '@/data/mockData';

const howItWorks = [
  { icon: Mic, title: 'Speak or Write', description: 'Answer prompts by voice or text — introductions, topics, or interview questions.' },
  { icon: Brain, title: 'AI Analyzes You', description: 'Grammar, vocabulary, fluency, pace, filler words and confidence are scored in seconds.' },
  { icon: Target, title: 'Get a Learner Profile', description: 'A dynamic profile tracks your strengths and weaknesses, updated after every session.' },
  { icon: LineChart, title: 'Practice What Matters', description: 'Exercises adapt daily — no two students get the same plan.' },
];

const features = [
  { icon: Brain, title: 'AI Communication Analysis', description: 'Deep analysis of grammar, vocabulary, structure and tone across every response you give.' },
  { icon: Mic, title: 'Voice Practice', description: 'Record real answers and get instant feedback on fluency, pace and filler words.' },
  { icon: Target, title: 'Personalized Learning', description: 'A profile that evolves with you — never static, always tuned to your weak spots.' },
  { icon: Briefcase, title: 'Interview Practice', description: 'Realistic HR, technical and behavioral mock interviews with structured feedback.' },
  { icon: LineChart, title: 'Performance Analytics', description: 'Track improvement over time with clear, professional dashboards.' },
  { icon: Sparkles, title: 'Adaptive Exercises', description: 'Difficulty and topics shift automatically based on your recent performance.' },
];

const faqs = [
  { question: 'Does every student get the same exercises?', answer: 'No. The platform builds a dynamic learner profile from your voice and text sessions, then generates exercises targeted at your specific weaknesses — grammar, fluency, vocabulary, pace or confidence.' },
  { question: 'What does the AI actually analyze?', answer: 'Grammar accuracy, vocabulary range, fluency, speaking pace, filler word frequency, response structure, pronunciation and overall communication confidence.' },
  { question: 'Can I practice for a specific interview type?', answer: 'Yes — choose HR, Technical, Behavioral, Resume-based, or a full Mock Interview, and the questions and evaluation adapt accordingly.' },
  { question: 'Is my progress tracked over time?', answer: 'Every session updates your learner profile. The Analytics page shows trends, skill breakdowns and week-over-week improvement.' },
  { question: 'Do I need special equipment?', answer: 'Just a microphone and a browser. Voice Practice and Interview Practice work directly from your device mic.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative">
        <ParticleField className="pointer-events-none absolute inset-0 h-[820px] w-full opacity-60" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
          <Reveal>
            <Badge variant="accent" className="mb-5">
              <Sparkles className="size-3.5" /> AI-Powered Communication Coach
            </Badge>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] text-base-50 sm:text-5xl lg:text-[3.4rem]">
              Build Better Communication.
              <br />
              <span className="text-gradient">Perform Better</span> in Every Interview.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-base-300">
              An adaptive AI system that evaluates your grammar, vocabulary, fluency, pace and confidence through
              real voice and text practice — then builds a learning plan that's actually yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Practice <ArrowRight className="size-4.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                View Demo
              </Button>
            </div>
            <div className="mt-10">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-base-500">Live voice analysis</p>
              <Waveform active bars={44} className="justify-start" />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative mx-auto h-[380px] w-[380px] max-w-full sm:h-[440px] sm:w-[440px]">
              <CommunicationOrb active className="h-full w-full" />
              <div className="glass absolute -left-2 bottom-6 rounded-xl px-4 py-3 shadow-soft-lg sm:left-0">
                <p className="text-[11px] uppercase tracking-wide text-base-400">Confidence</p>
                <p className="font-display text-lg font-semibold text-success-400">+18%</p>
              </div>
              <div className="glass absolute -right-2 top-8 rounded-xl px-4 py-3 shadow-soft-lg sm:right-0">
                <p className="text-[11px] uppercase tracking-wide text-base-400">Filler Words</p>
                <p className="font-display text-lg font-semibold text-accent-300">-42%</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-white/5 bg-base-900/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">How It Works</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-base-50">From first session to interview-ready</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <Card interactive className="h-full p-6">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                    <step.icon className="size-5" />
                  </div>
                  <p className="mb-1 text-xs font-semibold text-accent-400">Step {i + 1}</p>
                  <h3 className="font-display text-base font-semibold text-base-50">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-base-300">{step.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">Platform</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-base-50">Everything you need to communicate with confidence</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <Card interactive className="h-full p-6">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-azure-500/15 text-azure-400">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-base-50">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-base-300">{f.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONALIZATION SPOTLIGHT */}
      <section className="border-y border-white/5 bg-base-900/40 py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">Adaptive Exercises</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-base-50">No two learning plans look the same</h2>
            <p className="mt-4 text-sm leading-relaxed text-base-300">
              The system continuously tracks your weaknesses — grammar, fluency, vocabulary, pace or confidence —
              and rebuilds your daily plan around them. As you improve, difficulty increases automatically.
            </p>
            <ul className="mt-6 space-y-3">
              {['Weakness detection after every session', 'Difficulty adjusts automatically as you improve', 'Daily plan mixes speaking, writing and interview drills'].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-base-200">
                  <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-base-400">Today's Personalized Plan</p>
              <div className="space-y-3">
                {[
                  { icon: BookOpen, label: 'Vocabulary Practice', time: '10 min', tone: 'accent' as const },
                  { icon: Mic, label: 'Speaking Exercise', time: '8 min', tone: 'success' as const },
                  { icon: Briefcase, label: 'Interview Question', time: '10 min', tone: 'warning' as const },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-base-800/60 p-3.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
                      <t.icon className="size-4.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-base-50">{t.label}</p>
                      <p className="text-xs text-base-400">{t.time}</p>
                    </div>
                    <Gauge className="size-4 text-base-500" />
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">Testimonials</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-base-50">Trusted by students and placement cells</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.06}>
                <Card className="h-full p-6">
                  <div className="mb-3 flex items-center gap-0.5 text-warning-400">
                    {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="size-3.5 fill-current" />)}
                  </div>
                  <p className="text-sm leading-relaxed text-base-200">"{t.quote}"</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                    <div>
                      <p className="text-sm font-medium text-base-50">{t.name}</p>
                      <p className="text-xs text-base-400">{t.role}</p>
                    </div>
                    <Badge variant="success" size="sm">{t.score}</Badge>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/5 bg-base-900/40 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">FAQ</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-base-50">Frequently asked questions</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion items={faqs} />
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-700/20 via-transparent to-azure-600/10" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400">
              <ShieldCheck className="size-7" />
            </div>
            <h2 className="font-display text-3xl font-semibold text-base-50 sm:text-4xl">Ready to communicate with confidence?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-base-300">
              Start your first assessment today and get a personalized learning profile in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Practice <ArrowRight className="size-4.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Log In
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
