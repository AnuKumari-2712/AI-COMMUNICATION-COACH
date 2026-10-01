import { RadialProgress } from '@/components/ui/RadialProgress';
import { Card, Badge } from '@/components/ui';
import { scoreTone } from '@/lib/utils';
import type { VoiceAnalysisResult } from '@/services/practiceService';

export function VoiceAnalysisResults({ result }: { result: VoiceAnalysisResult }) {
  const rows: { label: string; value: number; note?: string }[] = [
    { label: 'Grammar', value: result.grammar },
    { label: 'Vocabulary', value: result.vocabulary },
    { label: 'Fluency', value: result.fluency },
    {
      label: 'Pronunciation',
      value: result.pronunciation,
      note: result.pronunciationReliable ? undefined : 'Estimated only — not a real audio measurement',
    },
    { label: 'Pace', value: result.pace, note: result.paceSource === 'measured' ? 'Measured from audio' : 'Estimated from transcript' },
    { label: 'Confidence', value: result.confidence },
  ];

  return (
    <div>
      {result.source === 'mock' && (
        <Badge variant="outline" size="sm" className="mb-3">
          Demo data — backend offline
        </Badge>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <Card key={r.label} className="flex flex-col items-center gap-2 p-4">
            <RadialProgress value={r.value} size={64} strokeWidth={6} tone={scoreTone(r.value)} />
            <span className="text-center text-xs text-base-300">{r.label}</span>
            {r.note && <span className="text-center text-[10px] leading-tight text-base-500">{r.note}</span>}
          </Card>
        ))}
        <Card className="flex flex-col items-center justify-center gap-1 p-4">
          <span className="font-display text-2xl font-semibold text-warning-400">{result.fillerWordCount}</span>
          <span className="text-center text-xs text-base-300">Filler Words</span>
          {(result.highConfidenceFillerCount > 0 || result.ambiguousFillerCount > 0) && (
            <span className="text-center text-[10px] leading-tight text-base-500">
              {result.highConfidenceFillerCount} clear, {result.ambiguousFillerCount} context-based
            </span>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-400">Speaking Pace</p>
        <p className="text-sm text-base-200">
          {Math.round(result.wordsPerMinute)} words/min
          <span className="ml-2 text-xs text-base-400">(comfortable range: {result.referenceRangeWpm} wpm)</span>
        </p>
        <p className="mt-1 text-xs text-base-500">
          {result.paceSource === 'measured'
            ? 'Measured from real pause/silence analysis of your recording.'
            : 'Estimated from your transcript — upload real WAV audio for a measured pace.'}
        </p>
      </Card>

      {!result.pronunciationReliable && (
        <Card className="mt-4 border-warning-500/20 bg-warning-500/5 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning-400">About the Pronunciation score</p>
          <p className="text-xs leading-relaxed text-base-300">{result.pronunciationMethod}</p>
        </Card>
      )}

      <Card className="mt-4 p-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-400">Transcript</p>
        <p className="text-sm leading-relaxed text-base-300">{result.transcript}</p>
      </Card>
    </div>
  );
}
