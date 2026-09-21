import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Gauge, Clock, TrendingUp, CheckCircle2, Circle, ArrowRight, BookOpen, Mic, Briefcase, SpellCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { SkillScoreCard } from '@/components/shared/SkillScoreCard';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { TrendAreaChart } from '@/components/charts/TrendAreaChart';
import { WeeklyBarChart } from '@/components/charts/WeeklyBarChart';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { CommunicationOrb } from '@/components/three/CommunicationOrb';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { studentService } from '@/services/studentService';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { DayPlan, SkillDistributionPoint, StudentProfile, TrendPoint, WeeklyActivityPoint } from '@/types';

const taskIcons = { grammar: SpellCheck, vocabulary: BookOpen, speaking: Mic, interview: Briefcase, fluency: Mic, text: BookOpen } as const;

export default function DashboardPage() {
  const { student: authStudent } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<WeeklyActivityPoint[]>([]);
  const [distribution, setDistribution] = useState<SkillDistributionPoint[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('mock');

  useEffect(() => {
    Promise.all([
      studentService.getProfile(),
      studentService.getTrend(),
      studentService.getWeeklyActivity(),
      studentService.getSkillDistribution(),
      studentService.getTodaysPlan(),
    ]).then(([p, t, a, d, plan]) => {
      setProfile(p);
      setTrend(t);
      setActivity(a);
      setDistribution(d);
      setPlan(plan);
      setDataSource(p.source);
      setLoading(false);
    });
  }, []);

  const [tasks, setTasks] = useState(plan?.tasks ?? []);
  useEffect(() => {
    if (plan) setTasks(plan.tasks);
  }, [plan]);

  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = authStudent.name.split(' ')[0];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}, ${firstName}`}
        description="Here's how your communication skills are progressing this week."
        actions={
          <div className="flex items-center gap-3">
            {!loading && <DataSourceBadge source={dataSource} />}
            <Button onClick={() => navigate('/app/practice/voice')}>
              Start Practice <ArrowRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !profile ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard index={0} icon={<Gauge className="size-5" />} label="Overall Communication Score" value={profile.scores.overall} suffix="/ 100" trend={6} tone="accent" />
            <StatCard index={1} icon={<Flame className="size-5" />} label="Learning Streak" value={profile.streakDays} suffix="days" trend={12} tone="warning" />
            <StatCard index={2} icon={<TrendingUp className="size-5" />} label="Weekly Progress" value="+9" suffix="pts" trend={9} tone="success" />
            <StatCard index={3} icon={<Clock className="size-5" />} label="Practice Time" value={Math.round(profile.totalPracticeMinutes / 60)} suffix="hrs total" tone="accent" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <Badge variant="success" size="sm">+22% in 7 weeks</Badge>
            </CardHeader>
            <CardContent>{loading ? <div className="h-64 animate-pulse-soft rounded-xl bg-base-800" /> : <TrendAreaChart data={trend} />}</CardContent>
          </Card>

          <div>
            <h3 className="mb-3 font-display text-base font-semibold text-base-50">Skill Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {loading || !profile
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse-soft rounded-2xl bg-base-800" />)
                : (
                    [
                      ['Grammar', profile.scores.grammar],
                      ['Vocabulary', profile.scores.vocabulary],
                      ['Fluency', profile.scores.fluency],
                      ['Pronunciation', profile.scores.pronunciation],
                      ['Confidence', profile.scores.confidence],
                      ['Speaking Pace', profile.scores.speakingPace],
                      ['Filler Words', profile.scores.fillerWords],
                      ['Structure', profile.scores.structure],
                    ] as [string, number][]
                  ).map(([label, value]) => <SkillScoreCard key={label} label={label} value={value} />)}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>{loading ? <div className="h-64 animate-pulse-soft rounded-xl bg-base-800" /> : <WeeklyBarChart data={activity} />}</CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative flex h-48 items-center justify-center bg-gradient-to-b from-accent-700/15 to-transparent">
              <CommunicationOrb className="h-40 w-40" />
            </div>
            <CardContent className="pt-0 text-center">
              <p className="font-display text-sm font-semibold text-base-50">Your AI Coach</p>
              <p className="mt-1 text-xs text-base-400">Ready to help with grammar, fluency and interview prep.</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate('/app/coach')}>
                Chat with Coach
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Personalized Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(loading ? Array.from({ length: 4 }) : tasks).map((task, i) => {
                if (loading || !task) return <div key={i} className="h-14 animate-pulse-soft rounded-xl bg-base-800" />;
                const t = task as (typeof tasks)[number];
                const Icon = taskIcons[t.type];
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      t.done ? 'border-success-500/20 bg-success-500/5' : 'border-white/5 bg-base-800/60 hover:border-white/10',
                    )}
                  >
                    {t.done ? <CheckCircle2 className="size-5 shrink-0 text-success-400" /> : <Circle className="size-5 shrink-0 text-base-500" />}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', t.done ? 'text-base-400 line-through' : 'text-base-50')}>{t.title}</p>
                      <p className="text-xs text-base-400">{t.minutes} min</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skill Distribution</CardTitle>
            </CardHeader>
            <CardContent>{loading ? <div className="h-64 animate-pulse-soft rounded-xl bg-base-800" /> : <SkillRadarChart data={distribution} />}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
