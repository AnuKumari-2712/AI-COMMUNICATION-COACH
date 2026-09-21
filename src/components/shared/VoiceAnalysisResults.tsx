import { RadialProgress } from '@/components/ui/RadialProgress';
import { Card } from '@/components/ui';
import { scoreTone } from '@/lib/utils';
import type { VoiceAnalysisResult } from '@/services/practiceService';

export function VoiceAnalysisResults({ result }: { result: VoiceAnalysisResult }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Grammar', value: result.grammar },
    { label: 'Fluency', value: result.fluency },
    { label: 'Pronunciation', value: result.pronunciation },
    { label: 'Pace', value: result.pace },
    { label: 'Confidence', value: result.confidence },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {rows.map((r) => (
          <Card key={r.label} className="flex flex-col items-center gap-2 p-4">
            <RadialProgress value={r.value} size={64} strokeWidth={6} tone={scoreTone(r.value)} />
            <span className="text-center text-xs text-base-300">{r.label}</span>
          </Card>
        ))}
        <Card className="flex flex-col items-center justify-center gap-1 p-4">
          <span className="font-display text-2xl font-semibold text-warning-400">{result.fillerWordCount}</span>
          <span className="text-center text-xs text-base-300">Filler Words</span>
        </Card>
      </div>
      <Card className="mt-4 p-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-400">Transcript</p>
        <p className="text-sm leading-relaxed text-base-300">{result.transcript}</p>
      </Card>
    </div>
  );
}
