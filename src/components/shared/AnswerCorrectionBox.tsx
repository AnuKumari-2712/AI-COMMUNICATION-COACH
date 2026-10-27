import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { Check, Copy, Sparkles, Mic, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export interface CorrectionItem {
  original: string;
  corrected: string;
  reason?: string;
  rule?: string;
  errorType?: string;
  sentence?: string;
}

interface AnswerCorrectionBoxProps {
  transcript?: string;
  correctedAnswer?: string;
  corrections?: CorrectionItem[];
  engine?: string;
  className?: string;
}

export function AnswerCorrectionBox({
  transcript,
  correctedAnswer,
  corrections = [],
  engine = 'gemini',
  className = '',
}: AnswerCorrectionBoxProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedCorrected, setCopiedCorrected] = useState(false);

  const cleanTranscript = (transcript || '').trim();
  const cleanCorrected = (correctedAnswer || cleanTranscript).trim();

  const handleCopyOriginal = () => {
    if (!cleanTranscript) return;
    navigator.clipboard.writeText(cleanTranscript);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleCopyCorrected = () => {
    if (!cleanCorrected) return;
    navigator.clipboard.writeText(cleanCorrected);
    setCopiedCorrected(true);
    setTimeout(() => setCopiedCorrected(false), 2000);
  };

  if (!cleanTranscript && !cleanCorrected && corrections.length === 0) {
    return null;
  }

  const engineLabel =
    engine === 'gemini'
      ? 'Gemini AI Engine'
      : engine === 'claude'
      ? 'Claude AI Engine'
      : engine === 't5'
      ? 'T5 Model'
      : 'Rule Engine';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Comparison Grid: Spoken Answer vs Corrected Answer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* User Spoken Answer */}
        <Card className="flex flex-col justify-between border-white/10 bg-base-850/80 p-5 shadow-soft">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2 text-base-300">
                <Mic className="size-4.5 text-accent-400" />
                <h4 className="font-display text-sm font-semibold text-base-100">Your Spoken Answer</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyOriginal}
                className="h-7 px-2 text-[11px] text-base-400 hover:text-base-100"
              >
                {copiedOriginal ? (
                  <>
                    <Check className="mr-1 size-3 text-success-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 size-3" /> Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm leading-relaxed text-base-200 whitespace-pre-wrap">
              {cleanTranscript ? (
                `"${cleanTranscript}"`
              ) : (
                <span className="italic text-base-500">No spoken transcript recorded.</span>
              )}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-base-500">
            <span>Speech Recognition Transcript</span>
            <span>{cleanTranscript ? cleanTranscript.split(/\s+/).filter(Boolean).length : 0} words</span>
          </div>
        </Card>

        {/* AI Corrected Answer */}
        <Card className="flex flex-col justify-between border-emerald-500/20 bg-emerald-500/[0.04] p-5 shadow-soft">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-emerald-500/10 pb-2.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="size-4.5" />
                <h4 className="font-display text-sm font-semibold text-emerald-300">AI Corrected Version</h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" className="text-[10px] py-0 px-2">
                  Meaning Preserved
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCorrected}
                  className="h-7 px-2 text-[11px] text-emerald-400/80 hover:text-emerald-200"
                >
                  {copiedCorrected ? (
                    <>
                      <Check className="mr-1 size-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-3" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm font-medium leading-relaxed text-emerald-100 whitespace-pre-wrap">
              {cleanCorrected ? (
                `"${cleanCorrected}"`
              ) : (
                <span className="italic text-base-500">Corrected version not available.</span>
              )}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-emerald-500/10 pt-2 text-[11px] text-emerald-500/80">
            <span>Grammatically Polished</span>
            <span className="font-mono">{engineLabel}</span>
          </div>
        </Card>
      </div>

      {/* 2. Detailed Mistakes Breakdown Box */}
      <Card className="border-white/10 bg-base-850/90 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-accent-400" />
            <h4 className="font-display text-base font-semibold text-base-50">Mistakes & Word Corrections Box</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={corrections.length === 0 ? 'success' : 'outline'}
              size="sm"
              className={corrections.length > 0 ? 'border-warning-500/40 text-warning-300' : ''}
            >
              {corrections.length} {corrections.length === 1 ? 'Correction' : 'Corrections'} Detected
            </Badge>
            <Badge variant="accent" size="sm" className="bg-accent-500/20 text-accent-300 border-accent-500/30 text-[10px]">
              {engineLabel}
            </Badge>
          </div>
        </div>

        {corrections.length > 0 ? (
          <div className="space-y-3">
            {corrections.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/5 bg-base-900/80 p-3.5 transition-all hover:border-white/15"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Wrong word */}
                    <span className="inline-flex items-center rounded-md border border-danger-500/30 bg-danger-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-danger-300 line-through">
                      {item.original}
                    </span>
                    <ArrowRight className="size-3.5 text-base-400" />
                    {/* Correct word */}
                    <span className="inline-flex items-center rounded-md border border-success-500/30 bg-success-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-success-300">
                      {item.corrected}
                    </span>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px] capitalize text-base-400">
                    {item.errorType || item.rule || 'Grammar'}
                  </Badge>
                </div>

                {item.reason && (
                  <p className="text-xs text-base-300 leading-relaxed">
                    <strong className="text-base-400 font-medium">Why: </strong>
                    {item.reason}
                  </p>
                )}

                {item.sentence && item.sentence !== item.original && (
                  <p className="mt-2 rounded-lg bg-base-800/60 px-2.5 py-1.5 text-[11px] text-base-400 italic">
                    <span className="not-italic font-medium text-base-500">In sentence: </span>
                    &ldquo;{item.sentence}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-success-500/20 bg-success-500/10 p-4 text-sm text-success-300">
            <Check className="size-5 shrink-0 text-success-400" />
            <div>
              <p className="font-semibold text-success-200">Zero Grammatical Mistakes!</p>
              <p className="text-xs text-success-400/90 mt-0.5">
                Every sentence in your spoken answer was grammatically sound with accurate tense and subject-verb agreement.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
