import { useState } from 'react';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { scoreTone } from '@/lib/utils';
import type { VoiceAnalysisResult } from '@/services/practiceService';
import {
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Activity,
  ShieldCheck,
  Volume2,
  Clock,
  HelpCircle,
} from 'lucide-react';

export function VoiceAnalysisResults({ result }: { result: VoiceAnalysisResult }) {
  const [copiedCorrected, setCopiedCorrected] = useState(false);

  const handleCopyCorrected = () => {
    if (!result.correctedAnswer) return;
    navigator.clipboard.writeText(result.correctedAnswer);
    setCopiedCorrected(true);
    setTimeout(() => setCopiedCorrected(false), 2000);
  };

  const isPronunciationAvailable = result.pronunciationAvailable === true;

  const scoreCards = [
    {
      label: 'Grammar',
      value: result.grammar,
      isAvailable: true,
      displayValue: undefined,
      tone: scoreTone(result.grammar),
      note: result.scoreReasons?.grammar || (result.grammar >= 90 ? 'High syntactic precision' : 'Review grammar corrections below'),
    },
    {
      label: 'Vocabulary',
      value: result.vocabulary,
      isAvailable: true,
      displayValue: undefined,
      tone: scoreTone(result.vocabulary),
      note: result.scoreReasons?.vocabulary || 'Lexical variety & word choice',
    },
    {
      label: 'Fluency',
      value: result.fluency,
      isAvailable: true,
      displayValue: undefined,
      tone: scoreTone(result.fluency),
      note: result.scoreReasons?.fluency || 'Cadence minus filler hesitations',
    },
    {
      label: 'Pronunciation',
      value: isPronunciationAvailable ? result.pronunciation : null,
      isAvailable: isPronunciationAvailable,
      displayValue: isPronunciationAvailable ? undefined : 'N/A',
      tone: isPronunciationAvailable && result.pronunciation !== null ? scoreTone(result.pronunciation) : ('neutral' as const),
      note: isPronunciationAvailable ? 'Acoustic alignment' : 'Not measured (Audio model offline)',
    },
    {
      label: 'Pace',
      value: result.pace,
      isAvailable: true,
      displayValue: undefined,
      tone: scoreTone(result.pace),
      note: `${Math.round(result.wordsPerMinute)} WPM (${result.paceSource === 'measured' ? 'audio pauses' : 'estimated'})`,
    },
    {
      label: 'Confidence',
      value: result.confidence,
      isAvailable: true,
      displayValue: undefined,
      tone: scoreTone(result.confidence),
      note: result.scoreReasons?.confidence || 'Cadence, steady delivery & clarity',
    },
  ];

  const corrections = result.corrections || [];

  return (
    <div className="space-y-6">
      {result.offline && (
        <Badge variant="outline" size="sm" className="mb-1">
          Demo data — backend offline
        </Badge>
      )}

      {!result.offline && result.source === 'mock' && (
        <Card className="border-warning-500/20 bg-warning-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-warning-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-400">
                No speech detected in this recording
              </p>
              <p className="mt-1 text-xs leading-relaxed text-base-300">
                We couldn&apos;t clearly detect speech in your audio. Please check that your microphone is unmuted, speak closer to the mic, and try recording again.
              </p>
            </div>
          </div>
        </Card>
      )}

      {result.sufficientData === false && result.source === 'real' && (
        <Card className="border-accent-500/20 bg-accent-500/5 p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="size-5 shrink-0 text-accent-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
                Brief Utterance Detected
              </p>
              <p className="mt-1 text-xs leading-relaxed text-base-300">
                Your recording contains fewer than 4 words. Scores reflect this limited sample; speak in complete conversational sentences for full depth analysis.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 6 Metric Radials + Filler Words Count Card */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {scoreCards.map((r) => (
          <Card key={r.label} className="flex flex-col items-center justify-between gap-2 p-4 text-center">
            <RadialProgress
              value={r.value}
              displayValue={r.displayValue}
              size={64}
              strokeWidth={6}
              tone={r.tone}
            />
            <div className="w-full">
              <span className="block text-center text-xs font-medium text-base-200">{r.label}</span>
              {r.note && (
                <span className="mt-1 block text-center text-[10px] leading-tight text-base-500 line-clamp-2">
                  {r.note}
                </span>
              )}
            </div>
          </Card>
        ))}

        {/* Dedicated Filler Words Count Card */}
        <Card className="flex flex-col items-center justify-between gap-2 p-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-base-800/80 border border-white/5">
            <span className="font-display text-2xl font-bold text-warning-400">
              {result.fillerWordCount}
            </span>
          </div>
          <div className="w-full">
            <span className="block text-center text-xs font-medium text-base-200">Filler Words</span>
            <span className="mt-1 block text-center text-[10px] leading-tight text-base-500">
              {result.highConfidenceFillerCount > 0 || result.ambiguousFillerCount > 0
                ? `${result.highConfidenceFillerCount} clear, ${result.ambiguousFillerCount} context`
                : 'Zero filler markers'}
            </span>
            {result.mostFrequentFiller && (
              <span className="mt-0.5 block text-center text-[10px] text-warning-400/90 font-mono">
                &ldquo;{result.mostFrequentFiller}&rdquo;
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Grammar & Style Corrections Section */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-accent-400" />
              <CardTitle className="text-base font-semibold text-base-50">Grammar & Style Corrections</CardTitle>
            </div>
            <Badge
              variant={corrections.length === 0 ? 'success' : 'outline'}
              size="sm"
              className={corrections.length > 0 ? 'border-accent-500/30 text-accent-300' : ''}
            >
              {corrections.length} {corrections.length === 1 ? 'issue' : 'issues'} detected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          {corrections.length > 0 ? (
            corrections.map((c, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-base-800/60 p-3.5 transition-colors hover:border-white/10">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className="border-accent-500/30 text-[10px] font-semibold uppercase tracking-wider text-accent-400"
                  >
                    {c.errorType || 'Grammar'}
                  </Badge>
                  <span className="text-[10px] text-base-500 font-mono">#{i + 1}</span>
                </div>
                <p className="text-sm">
                  <span className="rounded bg-danger-500/15 px-1.5 py-0.5 text-danger-300 line-through">
                    {c.original}
                  </span>
                  {' → '}
                  <span className="rounded bg-success-500/15 px-1.5 py-0.5 font-medium text-success-300">
                    {c.corrected}
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-base-400">{c.reason}</p>
                {c.sentence && (
                  <p className="mt-2 rounded-lg bg-base-900/60 px-2.5 py-1.5 text-[11px] text-base-400 italic">
                    <span className="not-italic font-medium text-base-500">Sentence context: </span>
                    &ldquo;{c.sentence}&rdquo;
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-success-500/20 bg-success-500/10 p-4 text-sm text-success-300">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>
                {result.sufficientData === false
                  ? 'No grammatical issues detected in the short speech sample.'
                  : 'No grammar issues found! Your spoken response demonstrates clear sentence structure and proper agreement.'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fully Corrected Version */}
      {result.correctedAnswer && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-5" />
              <h3 className="font-display text-base font-semibold text-base-50">Fully Corrected Spoken Answer</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                Meaning Preserved
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCorrected}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-base-300 hover:text-base-50"
              >
                {copiedCorrected ? (
                  <>
                    <Check className="size-3.5 text-success-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy Text
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs text-base-400">
            Your complete spoken answer with all grammatical, subject-verb, article, and tense errors corrected in place:
          </p>
          <div className="rounded-xl border border-white/5 bg-base-900/80 p-4">
            <p className="text-sm font-normal leading-relaxed text-base-100 whitespace-pre-wrap">
              {result.correctedAnswer}
            </p>
          </div>
        </Card>
      )}

      {/* Vocabulary Suggestions & Repeated Words */}
      {((result.vocabularySuggestions && result.vocabularySuggestions.length > 0) ||
        (result.repeatedWords && result.repeatedWords.length > 0)) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {result.vocabularySuggestions && result.vocabularySuggestions.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-accent-400">
                <Lightbulb className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Vocabulary Suggestions</h3>
              </div>
              <ul className="space-y-2">
                {result.vocabularySuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-base-300">
                    • <span dangerouslySetInnerHTML={{ __html: s }} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.repeatedWords && result.repeatedWords.length > 0 ? (
            <Card className="p-5 border-warning-500/20 bg-warning-500/5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-warning-400">
                  <Activity className="size-5" />
                  <h3 className="font-display text-base font-semibold text-base-50">Frequent Word Repetition</h3>
                </div>
                <Badge variant="warning" size="sm">
                  Lexical Variety
                </Badge>
              </div>
              <p className="mb-3 text-xs text-base-300">
                These words were repeated 3 or more times. Diversifying with executive synonyms will enhance your verbal impact:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.repeatedWords.map((w, i) => (
                  <Badge key={i} variant="outline" size="sm" className="border-warning-500/30 text-warning-300 font-mono">
                    {w}
                  </Badge>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-5 border-accent-500/20 bg-accent-500/5">
              <div className="mb-2 flex items-center gap-2 text-accent-400">
                <ShieldCheck className="size-5" />
                <h3 className="font-display text-base font-semibold text-base-50">Lexical Variety</h3>
              </div>
              <p className="text-sm text-base-300">
                No excessive word repetition detected. Your speech shows balanced vocabulary distribution.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Speaking Pace & Pause Diagnostics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent-400">
              <Clock className="size-5" />
              <p className="font-display text-base font-semibold text-base-50">Speaking Pace & Delivery</p>
            </div>
            <Badge
              variant={
                result.wordsPerMinute >= 120 && result.wordsPerMinute <= 165
                  ? 'success'
                  : result.wordsPerMinute < 120
                  ? 'warning'
                  : 'outline'
              }
              size="sm"
            >
              {result.wordsPerMinute >= 120 && result.wordsPerMinute <= 165
                ? 'Optimal Cadence'
                : result.wordsPerMinute < 120
                ? 'Deliberate / Slow'
                : 'Fast Tempo'}
            </Badge>
          </div>
          <p className="text-sm text-base-200">
            <span className="font-semibold text-base-50">{Math.round(result.wordsPerMinute)} words/min</span>
            <span className="ml-2 text-xs text-base-400">(interview benchmark: {result.referenceRangeWpm} wpm)</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-base-400">
            {result.paceSource === 'measured'
              ? 'Pace is measured from actual audio silence/pause segmentation of your WAV recording.'
              : 'Pace is estimated from transcript word count divided by recording duration.'}
          </p>
        </Card>

        {/* Observable Confidence Signals */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-accent-400">
            <Activity className="size-5" />
            <p className="font-display text-base font-semibold text-base-50">Observable Delivery Signals</p>
          </div>
          {result.confidenceSignals && result.confidenceSignals.length > 0 ? (
            <ul className="space-y-1.5">
              {result.confidenceSignals.map((signal, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-base-300">
                  <span className="size-1.5 rounded-full bg-accent-400" />
                  {signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-base-400">
              Cadence and tone evaluated based on speaking tempo, filler hesitation count, and grammatical continuity.
            </p>
          )}
        </Card>
      </div>

      {/* Pronunciation Transparency Note */}
      {!isPronunciationAvailable && (
        <Card className="border-base-700 bg-base-900/60 p-4">
          <div className="flex items-start gap-3">
            <Volume2 className="size-5 shrink-0 text-base-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-base-300">
                Pronunciation Status: Not Measured
              </p>
              <p className="mt-1 text-xs leading-relaxed text-base-400">
                {result.pronunciationMethod ||
                  'Phoneme-level audio acoustic alignment is not active for this recording. Only text transcript and temporal cadence were measured — pronunciation is never artificially estimated.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Full Transcript */}
      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-400">Spoken Transcript</p>
          <Badge variant="outline" size="sm" className="text-[10px]">
            {result.transcriptSource === 'browser' ? 'Browser Speech-to-Text' : 'Server STT'}
          </Badge>
        </div>
        <div className="rounded-xl border border-white/5 bg-base-900/70 p-4">
          <p className="text-sm leading-relaxed text-base-200">{result.transcript}</p>
        </div>
        {result.transcriptSource === 'browser' && (
          <p className="mt-2 text-[11px] text-base-500">
            Transcribed in real time by your browser&apos;s Web Speech API. Feedback is analyzed on the recognized transcript.
          </p>
        )}
      </Card>
    </div>
  );
}

