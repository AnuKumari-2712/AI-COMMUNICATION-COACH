import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Compass, Flame, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { StatCard } from '@/components/shared/StatCard';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { TrendAreaChart } from '@/components/charts/TrendAreaChart';
import { WeeklyBarChart } from '@/components/charts/WeeklyBarChart';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { ScoreDonutChart } from '@/components/charts/ScoreDonutChart';
import { studentService } from '@/services/studentService';
import { chartColors } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import type { SkillDistributionPoint, StudentProfile, TrendPoint, WeeklyActivityPoint } from '@/types';

const ranges = ['Daily', 'Weekly', 'Monthly'] as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>('Weekly');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<WeeklyActivityPoint[]>([]);
  const [distribution, setDistribution] = useState<SkillDistributionPoint[]>([]);
  const [profile, setProfile] = useState<(StudentProfile & { source: 'real' | 'mock' }) | null>(null);
  const [insights, setInsights] = useState<{ strengths: string[]; improvementAreas: string[]; recommendations: string[] } | null>(null);

  useEffect(() => {
    Promise.all([
      studentService.getTrend(),
      studentService.getWeeklyActivity(),
      studentService.getSkillDistribution(),
      studentService.getProfile(),
      studentService.getAnalysisInsights(),
    ]).then(([t, a, d, p, i]) => {
      setTrend(t);
      setActivity(a);
      setDistribution(d);
      setProfile(p);
      setInsights(i);
    });
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Progress"
        title="Analytics"
        description="A complete view of your improvement, activity and time invested."
        actions={
          <div className="flex items-center gap-3">
            {profile && <DataSourceBadge source={profile.source} />}
            <div className="flex rounded-xl border border-base-600 bg-base-850 p-1">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    range === r ? 'bg-accent-500 text-white' : 'text-base-300 hover:text-base-50',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} icon={<Flame className="size-5" />} label="Current Streak" value={profile?.streakDays ?? 0} suffix="days" tone="warning" />
        <StatCard index={1} icon={<Clock className="size-5" />} label="Practice Time" value={Math.round((profile?.totalPracticeMinutes ?? 0) / 60)} suffix="hrs" tone="accent" />
        <StatCard index={2} icon={<TrendingUp className="size-5" />} label="Exercises Completed" value={186} tone="success" />
        <StatCard index={3} icon={<Compass className="size-5" />} label="Improvement Rate" value="24" suffix="%" trend={24} tone="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Overall Score Over Time ({range})</CardTitle></CardHeader>
          <CardContent><TrendAreaChart data={trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Skill Distribution</CardTitle></CardHeader>
          <CardContent className="flex justify-center"><ScoreDonutChart value={profile?.scores.overall ?? 0} size={180} tone={chartColors.accent} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Practice Activity</CardTitle></CardHeader>
          <CardContent><WeeklyBarChart data={activity} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Skill Radar</CardTitle></CardHeader>
          <CardContent><SkillRadarChart data={distribution} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2 text-success-400"><TrendingUp className="size-5" /><h3 className="font-display text-base font-semibold text-base-50">Biggest Improvement</h3></div>
          <p className="text-sm text-base-300">{insights?.strengths[0] ?? 'Keep practicing to surface a standout strength.'}</p>
        </Card>
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2 text-warning-400"><TrendingDown className="size-5" /><h3 className="font-display text-base font-semibold text-base-50">Current Weakness</h3></div>
          <p className="text-sm text-base-300">{insights?.improvementAreas[0] ?? 'No significant weaknesses detected yet.'}</p>
        </Card>
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2 text-accent-400"><Compass className="size-5" /><h3 className="font-display text-base font-semibold text-base-50">Recommended Next Step</h3></div>
          <p className="text-sm text-base-300">{insights?.recommendations[0] ?? 'Complete a practice session to get a personalized recommendation.'}</p>
        </Card>
      </div>
    </div>
  );
}
