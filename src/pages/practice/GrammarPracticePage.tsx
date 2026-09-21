import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Button, ProgressBar } from '@/components/ui';
import { practiceService } from '@/services/practiceService';
import { cn } from '@/lib/utils';
import type { GrammarQuestion } from '@/types';

export default function GrammarPracticePage() {
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    practiceService.getGrammarQuestions().then(setQuestions);
  }, []);

  const question = questions[index];
  const isCorrect = question && (question.type === 'multiple-choice' ? selected === question.answer : inputValue.trim().toLowerCase() === question.answer.trim().toLowerCase());

  const handleCheck = () => {
    setChecked(true);
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setInputValue('');
    setSelected(null);
    setChecked(false);
  };

  const handleRestart = () => {
    setIndex(0);
    setInputValue('');
    setSelected(null);
    setChecked(false);
    setScore(0);
    setFinished(false);
  };

  if (!questions.length) return <div className="h-96 animate-pulse-soft rounded-2xl bg-base-800" />;

  if (finished) {
    return (
      <div>
        <PageHeader eyebrow="Practice" title="Grammar Practice" description="Personalized exercises generated from your recent weaknesses." />
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-success-500/15 text-success-400">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-base-50">Session Complete</h2>
          <p className="text-sm text-base-300">
            You scored {score} out of {questions.length}. Great focus on {questions[0].weakness}.
          </p>
          <Button onClick={handleRestart}>
            <RotateCcw className="size-4" /> Practice Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Grammar Practice" description="Dynamically generated exercises based on your grammar weaknesses." />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-base-300">Question {index + 1} of {questions.length}</span>
        <span className="text-sm font-medium text-base-100">Score: {score}</span>
      </div>
      <ProgressBar value={index} max={questions.length} tone="accent" className="mb-6" />

      <Card className="p-6">
        <Badge variant="accent" className="mb-4">Targets: {question.weakness}</Badge>
        <p className="text-lg font-medium text-base-50">{question.prompt}</p>

        <div className="mt-6">
          {question.type === 'multiple-choice' && question.options ? (
            <div className="space-y-2.5">
              {question.options.map((opt) => {
                const showState = checked;
                const isSelected = selected === opt;
                const isRight = opt === question.answer;
                return (
                  <button
                    key={opt}
                    disabled={checked}
                    onClick={() => setSelected(opt)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      !showState && isSelected && 'border-accent-400 bg-accent-500/10 text-accent-200',
                      !showState && !isSelected && 'border-base-600 bg-base-850 text-base-200 hover:border-base-500',
                      showState && isRight && 'border-success-500 bg-success-500/10 text-success-300',
                      showState && isSelected && !isRight && 'border-danger-500 bg-danger-500/10 text-danger-300',
                      showState && !isSelected && !isRight && 'border-base-700 text-base-400',
                    )}
                  >
                    {opt}
                    {showState && isRight && <CheckCircle2 className="size-4.5 shrink-0" />}
                    {showState && isSelected && !isRight && <XCircle className="size-4.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              value={inputValue}
              disabled={checked}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer..."
              className="w-full rounded-xl border border-base-600 bg-base-800/70 px-4 py-3 text-sm text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400"
            />
          )}
        </div>

        {checked && (
          <div className={cn('mt-5 rounded-xl border p-4', isCorrect ? 'border-success-500/30 bg-success-500/5' : 'border-danger-500/30 bg-danger-500/5')}>
            <p className="flex items-center gap-2 text-sm font-medium text-base-50">
              {isCorrect ? <CheckCircle2 className="size-4.5 text-success-400" /> : <XCircle className="size-4.5 text-danger-400" />}
              {isCorrect ? 'Correct!' : `Correct answer: ${question.answer}`}
            </p>
            <p className="mt-1.5 text-sm text-base-300">{question.explanation}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!checked ? (
            <Button onClick={handleCheck} disabled={question.type === 'multiple-choice' ? !selected : !inputValue.trim()}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {index + 1 >= questions.length ? 'Finish' : 'Next Question'} <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
