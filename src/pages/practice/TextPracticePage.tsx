import { useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles, CheckCircle2, Lightbulb, Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { ScoreDonutChart } from '@/components/charts/ScoreDonutChart';
import { practiceService, type TextAnalysisResult } from '@/services/practiceService';
import { chartColors } from '@/lib/chartTheme';
import { scoreTone } from '@/lib/utils';

const question = 'Tell me about yourself and why you are interested in this role.';

export default function TextPracticePage() {
  const [answer, setAnswer] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TextAnalysisResult | null>(null);

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  const handleSubmit = async () => {
    setAnalyzing(true);
    const analysis = await practiceService.analyzeText(question, answer);
    setResult(analysis);
    setAnalyzing(false);
  };

  const handleReset = () => {
    setAnswer('');
    setResult(null);
  };

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Text Practice" description="Write a response and get instant grammar, vocabulary and structure feedback." />

      <Card className="p-5">
        <Badge variant="accent" className="mb-3">
          <Sparkles className="size-3.5" /> AI Question
        </Badge>
        <p className="text-lg font-medium text-base-50">{question}</p>
      </Card>

      <Card className="mt-6 p-5">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!result}
          rows={8}
          placeholder="Type your answer here..."
          className="w-full resize-none rounded-xl border border-base-600 bg-base-800/70 p-4 text-sm leading-relaxed text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400 disabled:opacity-70"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-base-400">
          <span>{answer.length} characters</span>
          <span>{wordCount} words</span>
        </div>
        {!result && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} loading={analyzing} disabled={wordCount < 5}>
              Submit Answer <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </Card>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 lg:col-span-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-400">Communication Score</p>
              <ScoreDonutChart value={result.score} tone={chartColors.accent} />
              <Badge variant={result.source === 'real' ? 'success' : 'outline'} size="sm" className="mt-4">
                {result.source === 'real' ? 'Analyzed by NLP backend' : 'Demo data — backend offline'}
              </Badge>
              {result.overallScoreFormula && (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-base-500">{result.overallScoreFormula}</p>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Grammar Corrections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.corrections.map((c, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-base-800/60 p-3.5">
                    <p className="text-sm">
                      <span className="rounded bg-danger-500/15 px-1.5 py-0.5 text-danger-300 line-through">{c.original}</span>
                      {' → '}
                      <span className="rounded bg-success-500/15 px-1.5 py-0.5 text-success-300">{c.corrected}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-base-400">{c.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="mb-4 font-display text-base font-semibold text-base-50">Score Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { label: 'Grammar', value: result.grammarScore, sufficientData: result.grammarSufficientData },
                { label: 'Vocabulary', value: result.vocabularyScore, sufficientData: result.vocabularySufficientData },
                { label: 'Structure', value: result.structureScore, sufficientData: true },
                { label: 'Clarity', value: result.clarityScore, sufficientData: true },
              ] as const).map((m) => (
                <div key={m.label} className="rounded-xl border border-white/5 bg-base-800/60 p-3.5 text-center">
                  <p className={`font-display text-2xl font-semibold text-${scoreTone(m.value)}-400`}>{Math.round(m.value)}</p>
                  <p className="mt-1 text-xs text-base-400">{m.label}</p>
                  {!m.sufficientData && (
                    <Badge variant="outline" size="sm" className="mt-2">
                      Low confidence — short answer
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-400">
                <Target className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Answer Relevance</h3>
              </div>
              <span className={`font-display text-xl font-semibold text-${scoreTone(result.relevanceScore)}-400`}>
                {Math.round(result.relevanceScore)}
              </span>
            </div>
            <p className="mb-3 text-xs text-base-400">
              Measures whether your answer actually addresses the question (keyword overlap), not full language understanding.
              {!result.relevanceSufficientData && ' This question had too few identifiable keywords to judge relevance confidently.'}
            </p>
            {result.relevanceAddressedKeywords.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-base-400">Addressed:</span>
                {result.relevanceAddressedKeywords.map((k) => (
                  <Badge key={k} variant="success" size="sm">{k}</Badge>
                ))}
              </div>
            )}
            {result.relevanceMissingKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-base-400">Missing:</span>
                {result.relevanceMissingKeywords.map((k) => (
                  <Badge key={k} variant="warning" size="sm">{k}</Badge>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-accent-400">
                <Lightbulb className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Vocabulary Suggestions</h3>
              </div>
              <ul className="space-y-2">
                {result.vocabularySuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-base-300">{s}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-success-400">
                <CheckCircle2 className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Better Alternative</h3>
              </div>
              <p className="text-sm leading-relaxed text-base-200">{result.betterAlternative}</p>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="size-4" /> Try Another Question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
