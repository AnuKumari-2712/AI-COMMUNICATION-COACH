import { useEffect, useState } from 'react';
import { Users, Activity, Mic, Gauge, Briefcase, TrendingUp, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Badge, Input } from '@/components/ui';
import { StatCard } from '@/components/shared/StatCard';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { adminService } from '@/services/adminService';
import { chartColors } from '@/lib/chartTheme';
import type { AdminStudentRow, SkillDistributionPoint } from '@/types';

const statusTone: Record<AdminStudentRow['status'], 'success' | 'warning' | 'danger'> = { Active: 'success', 'At Risk': 'warning', Inactive: 'danger' };

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<{ totalStudents: number; activeUsers: number; practiceSessions: number; avgScore: number; interviewSessions: number; improvementRate: number } | null>(null);
  const [growth, setGrowth] = useState<{ month: string; users: number }[]>([]);
  const [activity, setActivity] = useState<{ day: string; sessions: number }[]>([]);
  const [distribution, setDistribution] = useState<SkillDistributionPoint[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([adminService.getOverview(), adminService.getGrowth(), adminService.getActivity(), adminService.getSkillDistribution(), adminService.getStudents()]).then(
      ([o, g, a, d, s]) => {
        setOverview(o);
        setGrowth(g);
        setActivity(a);
        setDistribution(d);
        setStudents(s);
      },
    );
  }, []);

  const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Admin Dashboard" description="Platform-wide usage, engagement and communication improvement metrics." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {overview ? (
          <>
            <StatCard index={0} icon={<Users className="size-5" />} label="Total Students" value={overview.totalStudents.toLocaleString()} tone="accent" />
            <StatCard index={1} icon={<Activity className="size-5" />} label="Active Users" value={overview.activeUsers.toLocaleString()} tone="success" trend={8} />
            <StatCard index={2} icon={<Mic className="size-5" />} label="Practice Sessions" value={overview.practiceSessions.toLocaleString()} tone="accent" />
            <StatCard index={3} icon={<Gauge className="size-5" />} label="Avg. Communication Score" value={overview.avgScore} suffix="/100" tone="warning" />
            <StatCard index={4} icon={<Briefcase className="size-5" />} label="Interview Sessions" value={overview.interviewSessions.toLocaleString()} tone="accent" />
            <StatCard index={5} icon={<TrendingUp className="size-5" />} label="Improvement Rate" value={overview.improvementRate} suffix="%" trend={overview.improvementRate} tone="success" />
          </>
        ) : (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse-soft rounded-2xl bg-base-800" />)
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>User Growth</CardTitle></CardHeader>
          <CardContent><SimpleLineChart data={growth} xKey="month" yKey="users" color={chartColors.accent} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Skill Distribution</CardTitle></CardHeader>
          <CardContent><SkillRadarChart data={distribution} /></CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Weekly Activity</CardTitle></CardHeader>
        <CardContent><SimpleBarChart data={activity} xKey="day" yKey="sessions" color={chartColors.azure} /></CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <CardTitle>Student Management</CardTitle>
          <Input placeholder="Search students..." icon={<Search className="size-4" />} value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-base-400">
                <th className="pb-3 pr-4 font-medium">Student</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Score</th>
                <th className="pb-3 pr-4 font-medium">Progress</th>
                <th className="pb-3 pr-4 font-medium">Last Active</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s) => (
                <tr key={s.id} className="text-base-200">
                  <td className="py-3 pr-4 font-medium text-base-50">{s.name}</td>
                  <td className="py-3 pr-4 text-base-400">{s.email}</td>
                  <td className="py-3 pr-4">{s.score}</td>
                  <td className="py-3 pr-4">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-base-700">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${s.progress}%` }} />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-base-400">{s.lastActive}</td>
                  <td className="py-3">
                    <Badge variant={statusTone[s.status]} size="sm">{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-base-400">No students match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
