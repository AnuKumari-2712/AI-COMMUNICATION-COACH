import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Lightbulb, Mic, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { ScoreDonutChart } from '@/components/charts/ScoreDonutChart';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { MultiLineChart } from '@/components/charts/MultiLineChart';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { studentService } from '@/services/studentService';
import { chartColors } from '@/lib/chartTheme';
import { scoreTone } from '@/lib/utils';
import type { SkillDistributionPoint, StudentProfile, TrendPoint } from '@/types';

export default function CommunicationAnalysisPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [distribution, setDistribution] = useState<SkillDistributionPoint[]>([]);
  const [insights, setInsights] = useState<{ strengths: string[]; improvementAreas: string[]; recommendations: string[]; source: 'real' | 'mock' } | null>(null);

  useEffect(() => {
    Promise.all([studentService.getProfile(), studentService.getTrend(), studentService.getSkillDistribution(), studentService.getAnalysisInsights()]).then(
      ([p, t, d, i]) => {
        setProfile(p);
        setTrend(t);
        setDistribution(d);
        setInsights(i);
      },
    );
  }, []);

  if (!profile || !insights) {
    return <div className="h-96 animate-pulse-soft rounded-2xl bg-base-800" />;
  }

  const skillRows: { label: string; value: number }[] = [
    { label: 'Grammar', value: profile.scores.grammar },
    { label: 'Vocabulary', value: profile.scores.vocabulary },
    { label: 'Fluency', value: profile.scores.fluency },
    { label: 'Confidence', value: profile.scores.confidence },
    { label: 'Pronunciation', value: profile.scores.pronunciation },
    { label: 'Speaking Pace', value: profile.scores.speakingPace },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Deep Dive"
        title="Communication Analysis"
        description="A detailed breakdown of your grammar, vocabulary, fluency, confidence and pronunciation."
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge source={insights.source} />
            <Button variant="outline" size="sm" onClick={() => navigate('/app/practice/text')}><FileText className="size-4" /> Text Practice</Button>
            <Button size="sm" onClick={() => navigate('/app/practice/voice')}><Mic className="size-4" /> Voice Practice</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 lg:col-span-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-base-400">Overall Score</p>
          <ScoreDonutChart value={profile.scores.overall} size={180} tone={chartColors.accent} />
          <Badge variant="success" className="mt-4">Intermediate → Advanced track</Badge>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Skill Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadarChart data={distribution} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {skillRows.map((row) => (
          <Card key={row.label} className="flex flex-col items-center gap-2 p-4">
            <RadialProgress value={row.value} size={68} strokeWidth={6} tone={scoreTone(row.value)} />
            <span className="text-center text-xs text-base-300">{row.label}</span>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Score Trend by Skill</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiLineChart data={trend} />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-success-400">
            <CheckCircle2 className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">Strengths</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.strengths.map((s) => (
              <li key={s} className="text-sm text-base-300">{s}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-warning-400">
            <AlertTriangle className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">Areas to Improve</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.improvementAreas.map((s) => (
              <li key={s} className="text-sm text-base-300">{s}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-accent-400">
            <Lightbulb className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">Recommendations</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.recommendations.map((s) => (
              <li key={s} className="text-sm text-base-300">{s}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
