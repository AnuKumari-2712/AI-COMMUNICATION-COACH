import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Target, TrendingUp, Flag, BookOpen, Mic, Briefcase, SpellCheck, Waves, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { studentService } from '@/services/studentService';
import { cn } from '@/lib/utils';
import type { DayPlan, StudentProfile } from '@/types';

const taskIcons = { grammar: SpellCheck, vocabulary: BookOpen, speaking: Mic, interview: Briefcase, fluency: Waves, text: BookOpen } as const;

export default function LearningPlanPage() {
  const [week, setWeek] = useState<DayPlan[]>([]);
  const [profile, setProfile] = useState<(StudentProfile & { source: 'real' | 'mock' }) | null>(null);
  const [revisionQueue, setRevisionQueue] = useState<string[]>([]);

  useEffect(() => {
    studentService.getWeekPlan().then(setWeek);
    studentService.getProfile().then(setProfile);
    studentService.getRevisionQueue().then(setRevisionQueue);
  }, []);

  const totalMinutes = week.reduce((sum, d) => sum + d.tasks.reduce((s, t) => s + t.minutes, 0), 0);

  const clearTopic = async (topic: string) => {
    setRevisionQueue((prev) => prev.filter((t) => t !== topic));
    await studentService.clearRevisionTopic(topic);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Adaptive Plan"
        title="Personalized Learning Plan"
        description="Your 7-day plan adapts automatically based on your weaknesses and progress."
        actions={profile && <DataSourceBadge source={profile.source} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400"><Target className="size-4.5" /></div>
          <p className="font-display text-lg font-semibold text-base-50">{profile?.currentLevel ?? '—'}</p>
          <p className="text-xs text-base-400">Current Level</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-success-500/15 text-success-400"><Flag className="size-4.5" /></div>
          <p className="font-display text-lg font-semibold text-base-50">{profile?.targetLevel ?? '—'}</p>
          <p className="text-xs text-base-400">Target Level</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-azure-500/15 text-azure-400"><TrendingUp className="size-4.5" /></div>
          <p className="font-display text-lg font-semibold text-base-50">Interview Readiness</p>
          <p className="text-xs text-base-400">Learning Goal</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-warning-500/15 text-warning-400"><CheckCircle2 className="size-4.5" /></div>
          <p className="font-display text-lg font-semibold text-base-50">{totalMinutes} min</p>
          <p className="text-xs text-base-400">Weekly Target</p>
        </Card>
      </div>

      {revisionQueue.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Topics to Review</CardTitle>
            <Badge variant="warning" size="sm">
              <RotateCcw className="size-3.5" /> Auto-added from repeated mistakes
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2.5">
            {revisionQueue.map((topic) => (
              <span key={topic} className="flex items-center gap-2 rounded-full border border-warning-500/30 bg-warning-500/10 py-1.5 pl-3.5 pr-2 text-xs font-medium text-warning-300">
                {topic}
                <button
                  onClick={() => clearTopic(topic)}
                  aria-label={`Mark ${topic} as reviewed`}
                  className="flex size-4.5 items-center justify-center rounded-full text-warning-400 hover:bg-warning-500/20 focus-ring"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {week.map((day, i) => {
          const doneCount = day.tasks.filter((t) => t.done).length;
          const isToday = i === 0;
          return (
            <Card key={day.day} className={cn('flex flex-col p-4', isToday && 'border-accent-400/40 ring-1 ring-accent-400/20')}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-sm font-semibold text-base-50">{day.day}</p>
                {isToday && <Badge variant="accent" size="sm">Today</Badge>}
              </div>
              <p className="mb-3 text-xs text-base-400">{day.focus}</p>
              <div className="flex-1 space-y-2">
                {day.tasks.map((task) => {
                  const Icon = taskIcons[task.type];
                  return (
                    <div key={task.id} className="flex items-center gap-2 rounded-lg bg-base-800/60 p-2">
                      {task.done ? <CheckCircle2 className="size-3.5 shrink-0 text-success-400" /> : <Circle className="size-3.5 shrink-0 text-base-500" />}
                      <Icon className="size-3.5 shrink-0 text-accent-400" />
                      <span className={cn('flex-1 truncate text-[11px]', task.done ? 'text-base-500 line-through' : 'text-base-200')}>{task.title}</span>
                      <span className="text-[10px] text-base-500">{task.minutes}m</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-base-500">{doneCount}/{day.tasks.length} completed</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
