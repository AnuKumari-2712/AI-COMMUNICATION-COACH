import { useState, useMemo } from 'react';
import {
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Target,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  HelpCircle,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ProgressBar } from '@/components/ui';
import { ScoreDonutChart } from '@/components/charts/ScoreDonutChart';
import { practiceService, type TextAnalysisResult } from '@/services/practiceService';
import { chartColors } from '@/lib/chartTheme';
import { cn, scoreTone } from '@/lib/utils';

export interface PracticeQuestion {
  id: string;
  category: 'HR & Intro' | 'Behavioral' | 'Technical' | 'Leadership' | 'Situational';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  tips: string;
}

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  // HR & Intro
  {
    id: 'hr-1',
    category: 'HR & Intro',
    difficulty: 'Easy',
    question: 'Tell me about yourself and why you are interested in this role.',
    tips: 'Give a concise 60-90 second summary: present role, key accomplishments, and why this specific position excites you.',
  },
  {
    id: 'hr-2',
    category: 'HR & Intro',
    difficulty: 'Easy',
    question: 'What are your greatest professional strengths, and how do they benefit your team?',
    tips: 'Pick 2-3 genuine strengths relevant to the job and back each up with a concrete example or metric.',
  },
  {
    id: 'hr-3',
    category: 'HR & Intro',
    difficulty: 'Medium',
    question: 'What is your biggest professional weakness, and what steps are you taking to overcome it?',
    tips: 'Choose a real skill (not a fake flaw like "perfectionism") and focus 70% of your answer on active improvement steps.',
  },
  {
    id: 'hr-4',
    category: 'HR & Intro',
    difficulty: 'Medium',
    question: 'Where do you see yourself professionally in the next three to five years?',
    tips: 'Highlight continuous skill development, increasing responsibility, and long-term commitment to the domain.',
  },
  {
    id: 'hr-5',
    category: 'HR & Intro',
    difficulty: 'Easy',
    question: 'Why do you want to join our company rather than other competitors in the industry?',
    tips: 'Mention specific products, company values, engineering culture, or market vision that genuinely resonate with you.',
  },

  // Behavioral (STAR)
  {
    id: 'beh-1',
    category: 'Behavioral',
    difficulty: 'Medium',
    question: 'Describe a challenging project you handled and how you overcame the obstacles.',
    tips: 'Structure using the STAR framework: Situation, Task, Action you took, and measurable Result.',
  },
  {
    id: 'beh-2',
    category: 'Behavioral',
    difficulty: 'Hard',
    question: 'Tell me about a time you made a significant mistake at work. How did you handle and resolve it?',
    tips: 'Take prompt accountability, explain immediate mitigation, and conclude with the preventive system or checklist you built.',
  },
  {
    id: 'beh-3',
    category: 'Behavioral',
    difficulty: 'Medium',
    question: 'Describe a situation where you had to deliver results under a tight or sudden deadline.',
    tips: 'Explain how you prioritized core features, communicated transparently with stakeholders, and delivered quality on time.',
  },
  {
    id: 'beh-4',
    category: 'Behavioral',
    difficulty: 'Medium',
    question: 'Tell me about a time you received difficult or critical feedback. How did you respond?',
    tips: 'Show emotional maturity, active listening without defensiveness, and concrete behavioral changes made as a result.',
  },
  {
    id: 'beh-5',
    category: 'Behavioral',
    difficulty: 'Hard',
    question: 'Describe a time you had to persuade reluctant stakeholders or teammates to adopt your proposal.',
    tips: 'Demonstrate data-driven arguments, understanding opposing concerns, and building incremental consensus.',
  },

  // Technical & Problem Solving
  {
    id: 'tech-1',
    category: 'Technical',
    difficulty: 'Medium',
    question: 'How do you approach debugging a critical production bug when there is limited documentation or logs?',
    tips: 'Walk through your diagnostic workflow: reproducing the issue, isolating failure points, using logs/metrics, and verifying fixes.',
  },
  {
    id: 'tech-2',
    category: 'Technical',
    difficulty: 'Medium',
    question: 'Explain a complex technical concept or architecture you worked on in simple, clear terms.',
    tips: 'Use an everyday analogy, break it into core components, and explain why the design was chosen.',
  },
  {
    id: 'tech-3',
    category: 'Technical',
    difficulty: 'Hard',
    question: 'Describe a situation where you had to make a tough trade-off between code perfection and delivery speed.',
    tips: 'Acknowledge technical debt tradeoffs, testing requirements, and plan for subsequent refactoring or stabilization.',
  },
  {
    id: 'tech-4',
    category: 'Technical',
    difficulty: 'Hard',
    question: 'How do you ensure reliability, error handling, and performance when designing a new feature or API?',
    tips: 'Discuss input validation, edge cases, caching, load considerations, monitoring, and automated test coverage.',
  },
  {
    id: 'tech-5',
    category: 'Technical',
    difficulty: 'Easy',
    question: 'How do you evaluate and learn a brand-new technology, framework, or library for an upcoming project?',
    tips: 'Explain your systematic approach: documentation review, building proof-of-concept prototypes, assessing community support.',
  },

  // Leadership & Teamwork
  {
    id: 'lead-1',
    category: 'Leadership',
    difficulty: 'Medium',
    question: 'Tell me about a time you had a disagreement with a coworker on technical direction. How was it resolved?',
    tips: 'Focus on mutual respect, evaluating options objectively with data or benchmarks, and uniting behind the team decision.',
  },
  {
    id: 'lead-2',
    category: 'Leadership',
    difficulty: 'Medium',
    question: 'Describe a time you mentored or supported a junior team member or peer who was struggling.',
    tips: 'Highlight patience, pairing sessions, encouraging independent problem-solving, and celebrating their progress.',
  },
  {
    id: 'lead-3',
    category: 'Leadership',
    difficulty: 'Hard',
    question: 'How do you keep teammates motivated and aligned when a project experiences unexpected delays or setbacks?',
    tips: 'Discuss transparent communication, breaking hurdles into achievable quick-wins, and maintaining high team psychological safety.',
  },
  {
    id: 'lead-4',
    category: 'Leadership',
    difficulty: 'Medium',
    question: 'Tell me about an instance where you stepped up and took initiative outside of your assigned responsibilities.',
    tips: 'Describe the gap you identified, why it mattered for the team/product, and the tangible positive outcome produced.',
  },
  {
    id: 'lead-5',
    category: 'Leadership',
    difficulty: 'Hard',
    question: 'How do you manage cross-functional communication when collaborating with designers, product managers, and QA?',
    tips: 'Emphasize shared terminology, proactive status updates, early syncs to prevent surprises, and clear definition of done.',
  },

  // Situational
  {
    id: 'sit-1',
    category: 'Situational',
    difficulty: 'Medium',
    question: 'If you were assigned two high-priority tasks with identical deadlines, how would you decide what to tackle first?',
    tips: 'Assess business impact, dependencies, and risk. Communicate early with managers to align on priority rather than guessing.',
  },
  {
    id: 'sit-2',
    category: 'Situational',
    difficulty: 'Hard',
    question: 'What would you do if you realized halfway through an implementation that the original design requirements were flawed?',
    tips: 'Pause immediately to quantify the flaw and impact, formulate alternative solutions with trade-offs, and brief leads promptly.',
  },
  {
    id: 'sit-3',
    category: 'Situational',
    difficulty: 'Medium',
    question: 'How would you handle a situation where a client or internal stakeholder is unhappy with project progress?',
    tips: 'Listen actively to understand their root concern, provide realistic timelines, reset expectations, and establish frequent checkpoints.',
  },
  {
    id: 'sit-4',
    category: 'Situational',
    difficulty: 'Hard',
    question: 'What would you do if a teammate was consistently missing commitments and impacting the sprint goal?',
    tips: 'Have a private, empathetic 1-on-1 first to understand roadblocks, offer support, and escalate constructively if unresolved.',
  },
  {
    id: 'sit-5',
    category: 'Situational',
    difficulty: 'Easy',
    question: 'If you joined a team with large legacy code and no documentation, how would you approach getting up to speed?',
    tips: 'Map end-to-end data flows, run tests, fix small bugs first to build familiarity, and write documentation as you learn.',
  },
];

const CATEGORIES = ['All', 'HR & Intro', 'Behavioral', 'Technical', 'Leadership', 'Situational'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export default function TextPracticePage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TextAnalysisResult | null>(null);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === 'All') return PRACTICE_QUESTIONS;
    return PRACTICE_QUESTIONS.filter((q) => q.category === selectedCategory);
  }, [selectedCategory]);

  // Ensure index stays in valid range when filter changes
  const safeIndex = currentIndex < filteredQuestions.length ? currentIndex : 0;
  const currentQuestion = filteredQuestions[safeIndex] || PRACTICE_QUESTIONS[0];

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  const handleCategoryChange = (cat: CategoryFilter) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setAnswer('');
    setResult(null);
  };

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    setAnswer('');
    setResult(null);
  };

  const handlePrevQuestion = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
    setAnswer('');
    setResult(null);
  };

  const handleRandomQuestion = () => {
    if (filteredQuestions.length <= 1) return;
    let nextIdx = safeIndex;
    while (nextIdx === safeIndex) {
      nextIdx = Math.floor(Math.random() * filteredQuestions.length);
    }
    setCurrentIndex(nextIdx);
    setAnswer('');
    setResult(null);
  };

  const handleSubmit = async () => {
    setAnalyzing(true);
    const analysis = await practiceService.analyzeText(currentQuestion.question, answer);
    setResult(analysis);
    setAnalyzing(false);
  };

  const [copiedCorrected, setCopiedCorrected] = useState(false);

  const handleReset = () => {
    setAnswer('');
    setResult(null);
    setCopiedCorrected(false);
  };

  const handleCopyCorrected = () => {
    const textToCopy = result?.correctedText || result?.correctedAnswer;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCorrected(true);
    setTimeout(() => setCopiedCorrected(false), 2000);
  };

  const difficultyVariant = (diff: PracticeQuestion['difficulty']) => {
    switch (diff) {
      case 'Easy':
        return 'success' as const;
      case 'Medium':
        return 'warning' as const;
      case 'Hard':
        return 'danger' as const;
    }
  };

  const getScoreTextColor = (val: number) => {
    if (val >= 75) return 'text-success-400';
    if (val >= 50) return 'text-warning-400';
    return 'text-danger-400';
  };

  const getScoreStatusBadge = (val: number): { label: string; variant: 'success' | 'warning' | 'danger' } => {
    if (val >= 85) return { label: 'Strong', variant: 'success' };
    if (val >= 70) return { label: 'Proficient', variant: 'success' };
    if (val >= 50) return { label: 'Fair', variant: 'warning' };
    return { label: 'Needs Work', variant: 'danger' };
  };

  return (
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Text Practice"
        description="Write a response to real interview questions and receive instant AI grammar, vocabulary, relevance, and executive-level feedback."
      />

      {/* Category Filter Pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-base-400 mr-1">
          <Filter className="size-3.5" /> Category:
        </span>
        {CATEGORIES.map((cat) => {
          const count = cat === 'All' ? PRACTICE_QUESTIONS.length : PRACTICE_QUESTIONS.filter((q) => q.category === cat).length;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-500 text-white shadow-sm'
                  : 'border border-white/10 bg-base-800/80 text-base-300 hover:bg-base-700/80 hover:text-base-100'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Question Card with Controls */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">
              <Sparkles className="size-3.5" /> {currentQuestion.category}
            </Badge>
            <Badge variant={difficultyVariant(currentQuestion.difficulty)} size="sm">
              {currentQuestion.difficulty}
            </Badge>
            <span className="text-xs text-base-400">
              Question {safeIndex + 1} of {filteredQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevQuestion}
              title="Previous Question"
              className="px-2.5 py-1"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextQuestion}
              title="Next Question"
              className="px-2.5 py-1"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomQuestion}
              title="Random Question"
              className="flex items-center gap-1 px-2.5 py-1 text-xs"
            >
              <Shuffle className="size-3.5" /> Shuffle
            </Button>
          </div>
        </div>

        <p className="mt-4 text-lg font-medium leading-snug text-base-50">{currentQuestion.question}</p>

        {currentQuestion.tips && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-500/15 bg-accent-500/5 p-2.5 text-xs text-accent-300">
            <HelpCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> {currentQuestion.tips}
            </span>
          </div>
        )}
      </Card>

      {/* Answer Writing Area */}
      <Card className="mt-6 p-5">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!result}
          rows={8}
          placeholder="Type your answer here... Write at least 15-20 words for comprehensive grammar, relevance, and vocabulary analysis."
          className="w-full resize-none rounded-xl border border-base-600 bg-base-800/70 p-4 text-sm leading-relaxed text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400 disabled:opacity-70"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-base-400">
          <span>{answer.length} characters</span>
          <span className={wordCount < 10 ? 'text-warning-400' : 'text-base-300'}>
            {wordCount} words {wordCount < 10 ? '(write 10+ words for better accuracy)' : ''}
          </span>
        </div>
        {!result && (
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={!answer.length}>
              Clear
            </Button>
            <Button onClick={handleSubmit} loading={analyzing} disabled={wordCount < 3}>
              Submit Answer <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Analysis Results */}
      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 lg:col-span-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-400">Communication Score</p>
              <ScoreDonutChart value={result.score} tone={chartColors.accent} />
              <Badge variant={result.source === 'real' ? 'success' : 'outline'} size="sm" className="mt-4">
                {result.source === 'real' ? 'Analyzed by NLP backend' : 'Analyzed by Intelligent Engine'}
              </Badge>
              {result.overallScoreFormula && (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-base-500">{result.overallScoreFormula}</p>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>Grammar & Style Corrections</CardTitle>
                    {result.grammarEngine && (
                      <Badge
                        variant="outline"
                        size="sm"
                        className={cn(
                          'text-[10px] font-semibold tracking-wide uppercase',
                          result.grammarEngine === 'claude'
                            ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                            : result.grammarEngine === 't5'
                            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                            : 'border-base-500/40 bg-base-500/10 text-base-300',
                        )}
                      >
                        <Sparkles className="size-3 mr-1" />
                        {result.grammarEngine === 'claude'
                          ? 'Claude AI'
                          : result.grammarEngine === 't5'
                          ? 'T5 Model'
                          : 'Rule Engine'}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={(result.totalMistakes ?? result.corrections.length) === 0 ? 'success' : 'warning'}
                    size="sm"
                    className="text-xs"
                  >
                    {(result.totalMistakes ?? result.corrections.length) === 0
                      ? '0 mistakes detected'
                      : `${result.totalMistakes ?? result.corrections.length} ${(result.totalMistakes ?? result.corrections.length) === 1 ? 'mistake' : 'mistakes'} detected across ${
                          (result.sentences?.length ?? 0) > 0
                            ? `${result.sentences!.length} ${result.sentences!.length === 1 ? 'sentence' : 'sentences'}`
                            : 'your answer'
                        }`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Full Corrected Version Box at Top */}
                {(result.correctedText || result.correctedAnswer) && (
                  <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 className="size-4 text-emerald-400" /> Fully Corrected Answer
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCorrected}
                        className="h-7 px-2.5 text-xs text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        {copiedCorrected ? (
                          <>
                            <Check className="size-3 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs font-normal leading-relaxed text-emerald-100 whitespace-pre-wrap">
                      {result.correctedText || result.correctedAnswer}
                    </p>
                  </div>
                )}

                {/* Sentence-by-Sentence Analysis */}
                {result.sentences && result.sentences.length > 0 ? (
                  <div className="space-y-3">
                    {result.sentences.map((sent, sIdx) => {
                      const hasErrors = sent.has_errors || (sent.mistakes && sent.mistakes.length > 0);
                      return (
                        <div
                          key={sIdx}
                          className={`rounded-xl border p-4 transition-all ${
                            hasErrors
                              ? 'border-white/10 bg-base-800/80 shadow-sm'
                              : 'border-emerald-500/25 bg-emerald-500/5'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-base-200">
                              Sentence #{sIdx + 1}
                            </span>
                            {hasErrors ? (
                              <Badge variant="warning" size="sm" className="text-[10px]">
                                {sent.mistakes.length} {sent.mistakes.length === 1 ? 'mistake' : 'mistakes'}
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm" className="flex items-center gap-1 text-[10px]">
                                <CheckCircle2 className="size-3 text-emerald-400" /> No mistakes in this sentence
                              </Badge>
                            )}
                          </div>

                          {/* Original Sentence */}
                          <div className="mt-2 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-base-400">Original</span>
                            <p className={`rounded-lg p-2.5 text-xs font-mono leading-relaxed ${
                              hasErrors ? 'border border-white/5 bg-base-900/70 text-base-200' : 'text-base-300'
                            }`}>
                              {sent.original}
                            </p>
                          </div>

                          {/* Corrected Sentence */}
                          {hasErrors && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Corrected</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(sent.corrected)}
                                  className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-300 transition-colors"
                                  title="Copy corrected sentence"
                                >
                                  <Copy className="size-2.5" /> Copy
                                </button>
                              </div>
                              <p className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5 text-xs font-medium leading-relaxed text-emerald-200">
                                {sent.corrected}
                              </p>
                            </div>
                          )}

                          {/* Mistakes Identified */}
                          {hasErrors && sent.mistakes && sent.mistakes.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-white/5 pt-2.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-base-400">
                                Mistakes Identified:
                              </span>
                              <div className="space-y-2">
                                {sent.mistakes.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="rounded-lg border border-white/5 bg-base-900/60 p-2.5 text-xs"
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <Badge
                                        variant="outline"
                                        size="sm"
                                        className="border-accent-500/30 text-[10px] font-semibold uppercase tracking-wider text-accent-400"
                                      >
                                        {m.type}
                                      </Badge>
                                    </div>
                                    <p className="text-xs">
                                      <span className="rounded bg-danger-500/15 px-1.5 py-0.5 font-mono text-danger-300 line-through">
                                        {m.wrong}
                                      </span>
                                      <span className="text-base-400 mx-1.5">→</span>
                                      <span className="rounded bg-success-500/15 px-1.5 py-0.5 font-mono font-medium text-success-300">
                                        {m.correct}
                                      </span>
                                    </p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-base-400">{m.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : result.corrections.length > 0 ? (
                  <div className="space-y-3">
                    {result.corrections.map((c, i) => (
                      <div key={i} className="rounded-xl border border-white/5 bg-base-800/60 p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Badge variant="outline" size="sm" className="border-accent-500/30 text-[10px] font-semibold uppercase tracking-wider text-accent-400">
                            {c.errorType || 'Grammar'}
                          </Badge>
                          <span className="text-[10px] text-base-500 font-mono">#{i + 1}</span>
                        </div>
                        <p className="text-sm">
                          <span className="rounded bg-danger-500/15 px-1.5 py-0.5 text-danger-300 line-through">{c.original}</span>
                          {' → '}
                          <span className="rounded bg-success-500/15 px-1.5 py-0.5 font-medium text-success-300">{c.corrected}</span>
                        </p>
                        <p className="mt-1.5 text-xs text-base-400">{c.reason}</p>
                        {c.sentence && (
                          <p className="mt-2 rounded-lg bg-base-900/60 px-2.5 py-1.5 text-[11px] text-base-400 italic">
                            <span className="not-italic font-medium text-base-500">Sentence context: </span>&ldquo;{c.sentence}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-success-500/20 bg-success-500/10 p-4 text-sm text-success-300">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>No grammar issues found! Your response has strong grammatical structure and tone.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-display text-base font-semibold text-base-50">Score Breakdown</h3>
                <p className="text-xs text-base-400">
                  Comprehensive 5-Pillar evaluation weighted according to corporate communication benchmarks.
                </p>
              </div>
              <Badge variant="outline" size="sm" className="text-xs">
                NLP Evaluation Model
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {([
                {
                  label: 'Grammar',
                  weight: '30%',
                  value: result.grammarScore,
                  sufficientData: result.grammarSufficientData,
                  desc: 'Syntax, tense & agreement',
                },
                {
                  label: 'Relevance',
                  weight: '25%',
                  value: result.relevanceScore,
                  sufficientData: result.relevanceSufficientData,
                  desc: 'Topic coverage & intent',
                },
                {
                  label: 'Vocabulary',
                  weight: '20%',
                  value: result.vocabularyScore,
                  sufficientData: result.vocabularySufficientData,
                  desc: 'Lexical depth & variety',
                },
                {
                  label: 'Structure',
                  weight: '15%',
                  value: result.structureScore,
                  sufficientData: true,
                  desc: 'Organization & flow',
                },
                {
                  label: 'Clarity',
                  weight: '10%',
                  value: result.clarityScore,
                  sufficientData: true,
                  desc: 'Readability & conciseness',
                },
              ] as const).map((m) => {
                const status = getScoreStatusBadge(m.value);
                const tone = scoreTone(m.value);
                const scoreColor = getScoreTextColor(m.value);
                return (
                  <div
                    key={m.label}
                    className="flex flex-col justify-between rounded-xl border border-white/5 bg-base-800/60 p-4 transition-colors hover:border-white/10"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-base-200">{m.label}</span>
                        <span className="text-[10px] font-medium text-base-400">Wt. {m.weight}</span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className={`font-display text-3xl font-bold ${scoreColor}`}>
                          {Math.round(m.value)}
                        </span>
                        <Badge variant={status.variant} size="sm" className="text-[10px]">
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <ProgressBar value={m.value} tone={tone} size="sm" />
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/5 pt-2 text-center sm:text-left">
                      <p className="text-[11px] text-base-400 leading-snug">{m.desc}</p>
                      {!m.sufficientData && (
                        <span className="mt-1 inline-block text-[10px] text-warning-400">
                          (Short sample)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-400">
                <Target className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Answer Relevance</h3>
                {result.relevanceEngine && (
                  <Badge
                    variant={result.relevanceEngine === 'claude' ? 'accent' : 'outline'}
                    size="sm"
                    className="text-[10px]"
                  >
                    {result.relevanceEngine === 'claude' ? 'Claude AI' : 'Keyword Match'}
                  </Badge>
                )}
              </div>
              <span className={`font-display text-xl font-semibold ${getScoreTextColor(result.relevanceScore)}`}>
                {Math.round(result.relevanceScore)}%
              </span>
            </div>
            {result.relevanceReason ? (
              <p className="mb-3 text-xs text-base-200 bg-base-900/60 rounded-lg p-2.5 border border-white/5">
                <strong className="text-accent-300">AI Assessment:</strong> {result.relevanceReason}
              </p>
            ) : (
              <p className="mb-3 text-xs text-base-400">
                Measures whether your answer directly addresses the interview question keywords and theme.
                {!result.relevanceSufficientData && ' This response had too few words to judge topic relevance with certainty.'}
              </p>
            )}
            {result.relevanceAddressedKeywords.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-base-400">Addressed:</span>
                {result.relevanceAddressedKeywords.map((k) => (
                  <Badge key={k} variant="success" size="sm">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
            {result.relevanceMissingKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-base-400">Consider including:</span>
                {result.relevanceMissingKeywords.map((k) => (
                  <Badge key={k} variant="warning" size="sm">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Fully Corrected Version (Requirement 6) */}
          {result.correctedAnswer && (
            <Card className="border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-5" />
                  <h3 className="font-display text-base font-semibold text-base-50">Fully Corrected Version</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm">
                    Exact Meaning Preserved
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCorrected}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-base-300 hover:text-base-50"
                  >
                    {copiedCorrected ? (
                      <>
                        <Check className="size-3.5 text-success-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="mb-3 text-xs text-base-400">
                Your complete answer with every grammar, spelling, article, and tense error fixed in place without altering your personal details:
              </p>
              <div className="rounded-xl border border-white/5 bg-base-900/80 p-4">
                <p className="text-sm font-normal leading-relaxed text-base-100 whitespace-pre-wrap">
                  {result.correctedAnswer}
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent-400">
                  <Lightbulb className="size-5" />
                  <h3 className="font-display text-base font-semibold text-base-50">Vocabulary Suggestions</h3>
                </div>
                {result.vocabEngine && (
                  <Badge
                    variant={result.vocabEngine === 'claude' ? 'accent' : 'outline'}
                    size="sm"
                    className="text-[10px]"
                  >
                    {result.vocabEngine === 'claude' ? 'Claude AI' : 'Rule Heuristics'}
                  </Badge>
                )}
              </div>
              <ul className="space-y-2">
                {result.vocabularySuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-base-300">
                    • {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 border-accent-500/30 bg-accent-500/5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent-400">
                  <Sparkles className="size-5" />
                  <h3 className="font-display text-base font-semibold text-base-50">Better Alternative</h3>
                </div>
                <Badge variant="accent" size="sm">
                  Executive Phrasing
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-base-200 italic whitespace-pre-wrap">{result.betterAlternative}</p>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleNextQuestion}>
              Next Question <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="size-4" /> Retry This Question
            </Button>
            <Button variant="ghost" onClick={handleRandomQuestion}>
              <Shuffle className="size-4" /> Random Question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
