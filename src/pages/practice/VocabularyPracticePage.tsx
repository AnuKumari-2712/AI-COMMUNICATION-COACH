import { useEffect, useState } from 'react';
import { Volume2, RotateCw, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Button, ProgressBar } from '@/components/ui';
import { FlipCard } from '@/components/shared/FlipCard';
import { practiceService } from '@/services/practiceService';
import { studentService } from '@/services/studentService';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { VocabWord } from '@/types';

const difficultyTone = { Easy: 'success', Medium: 'warning', Difficult: 'danger' } as const;

export default function VocabularyPracticePage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const { showToast } = useToast();
  const dailyGoal = 5;

  useEffect(() => {
    practiceService.getVocabWords().then(setWords);
  }, []);

  const learnedCount = words.filter((w) => w.learned).length;

  const markLearned = (id: string, word: string) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, learned: true } : w)));
    showToast({ title: 'Word mastered!', description: 'Added to your vocabulary bank.', variant: 'success' });
    studentService.markWordLearned(word);
  };

  const speak = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Vocabulary Practice" description="Flip each card to learn the meaning, then mark words you've mastered." />

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-base-100">Daily Vocabulary Goal</p>
          <span className="text-sm text-base-400">{Math.min(learnedCount, dailyGoal)} / {dailyGoal} words</span>
        </div>
        <ProgressBar value={Math.min(learnedCount, dailyGoal)} max={dailyGoal} tone="success" className="mt-2" />
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {words.map((word) => (
          <div key={word.id}>
            <FlipCard
              front={
                <Card className={cn('relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center', word.learned && 'border-success-500/30')}>
                  {word.learned && <CheckCircle2 className="absolute right-4 top-4 size-5 text-success-400" />}
                  <Badge variant={difficultyTone[word.difficulty]} size="sm">{word.difficulty}</Badge>
                  <h3 className="font-display text-2xl font-semibold text-base-50">{word.word}</h3>
                  <p className="text-sm text-base-400">{word.phonetic}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-base-500">
                    <RotateCw className="size-3.5" /> Tap to flip
                  </p>
                </Card>
              }
              back={
                <Card className="flex h-full flex-col justify-center gap-3 p-6">
                  <p className="text-sm font-medium text-base-100">{word.meaning}</p>
                  <p className="text-sm italic text-base-400">"{word.example}"</p>
                </Card>
              }
            />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => speak(word.word)}>
                <Volume2 className="size-4" /> Pronounce
              </Button>
              <Button size="sm" className="flex-1" disabled={word.learned} onClick={() => markLearned(word.id, word.word)}>
                {word.learned ? 'Learned' : 'Mark Learned'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
