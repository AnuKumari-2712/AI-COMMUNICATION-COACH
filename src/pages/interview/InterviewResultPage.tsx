import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { ScoreDonutChart } from '@/components/charts/ScoreDonutChart';
import { scoreTone } from '@/lib/utils';
import { chartColors } from '@/lib/chartTheme';
import type { InterviewResult } from '@/services/interviewService';

export default function InterviewResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { result?: InterviewResult; categoryTitle?: string } | null;

  if (!state?.result) {
    return (
      <div>
        <PageHeader eyebrow="Results" title="Interview Result" />
        <EmptyState
          icon={<Target className="size-6" />}
          title="No interview results yet"
          description="Complete a mock interview to see your detailed performance breakdown here."
          action={<Button onClick={() => navigate('/app/interview')}>Take an Interview</Button>}
        />
      </div>
    );
  }

  const { result, categoryTitle } = state;
  const rows: { label: string; value: number }[] = [
    { label: 'Communication', value: result.communication },
    { label: 'Confidence', value: result.confidence },
    { label: 'Clarity', value: result.clarity },
    { label: 'Grammar', value: result.grammar },
    { label: 'Vocabulary', value: result.vocabulary },
    { label: 'Structure', value: result.structure },
    { label: 'Fluency', value: result.fluency },
  ];

  return (
    <div>
      <PageHeader eyebrow={categoryTitle ?? 'Interview'} title="Interview Result" description="Here's a full breakdown of your performance." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 lg:col-span-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-base-400">Overall Interview Score</p>
          <ScoreDonutChart value={result.overall} size={180} tone={chartColors.accent} />
          <Badge variant={result.overall >= 75 ? 'success' : 'warning'} className="mt-4">
            {result.overall >= 75 ? 'Strong Performance' : 'Room to Improve'}
          </Badge>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col items-center gap-2">
                  <RadialProgress value={r.value} size={64} strokeWidth={6} tone={scoreTone(r.value)} />
                  <span className="text-center text-xs text-base-300">{r.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-success-400">
            <CheckCircle2 className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">What Went Well</h3>
          </div>
          <ul className="space-y-2.5">
            {result.wentWell.map((s) => <li key={s} className="text-sm text-base-300">{s}</li>)}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-warning-400">
            <AlertTriangle className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">Areas to Improve</h3>
          </div>
          <ul className="space-y-2.5">
            {result.needsImprovement.map((s) => <li key={s} className="text-sm text-base-300">{s}</li>)}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-accent-400">
            <Lightbulb className="size-5" />
            <h3 className="font-display text-base font-semibold text-base-50">Recommended Practice</h3>
          </div>
          <ul className="space-y-2.5">
            {result.recommendedExercises.map((s) => <li key={s} className="text-sm text-base-300">{s}</li>)}
          </ul>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate('/app/practice/fluency')}>
          Practice Weak Areas
        </Button>
        <Button onClick={() => navigate('/app/interview')}>
          <RotateCcw className="size-4" /> Take Another Interview
        </Button>
      </div>
    </div>
  );
}
