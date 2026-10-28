import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Briefcase,
  Layers,
  Zap,
  TrendingUp,
  FileCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ProgressBar } from '@/components/ui';
import { interviewService } from '@/services/interviewService';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ScoreBreakdownItem {
  score: number;
  max: number;
  count?: number;
  words?: number;
  found?: string[];
  missing?: string[];
}

interface ResumeAnalysisData {
  word_count: number;
  ats_score: number;
  score_breakdown?: {
    sections: ScoreBreakdownItem;
    skills: ScoreBreakdownItem;
    action_verbs: ScoreBreakdownItem;
    metrics: ScoreBreakdownItem;
    length: ScoreBreakdownItem;
  };
  skills: string[];
  action_verbs: string[];
  quantifiable_metrics_count?: number;
  detected_projects_count: number;
  strengths: string[];
  recommendations: string[];
  suggested_questions: string[];
  resume_text: string;
}

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysisData | null>(null);

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setLoading(true);
    try {
      const data = await interviewService.analyzeResume(file);
      setAnalysis(data);
      setManualText(data.resume_text);
      showToast({
        title: 'Resume Analyzed Successfully',
        description: `Parsed ${data.word_count} words and found ${data.skills.length} technical skills.`,
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Parsing Failed',
        description: 'Unable to extract text from PDF. Try copying and pasting your resume text below.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (manualText.trim().length < 50) {
      showToast({
        title: 'Text Too Short',
        description: 'Please paste at least 50 characters of your resume text.',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const blob = new Blob([manualText], { type: 'text/plain' });
      const file = new File([blob], 'resume.txt', { type: 'text/plain' });
      const data = await interviewService.analyzeResume(file);
      setAnalysis(data);
      showToast({
        title: 'Analysis Complete',
        description: `Extracted ${data.skills.length} skills and calculated ATS score.`,
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Analysis Error',
        description: 'Failed to analyze text. Please verify backend connection.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const startInterviewWithResume = () => {
    if (!analysis) return;
    navigate('/app/interview', {
      state: {
        autoStartCategory: 'resume',
        prefilledResumeText: analysis.resume_text,
      },
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Resume Intelligence"
        title="Resume & PDF Analyzer"
        description="Upload your resume in PDF format to receive instant ATS readability scores, extracted tech skills, action verb metrics, and custom interview questions."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Upload & Input Area */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-base-700/60 bg-base-900/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="size-4.5 text-accent-400" />
                Upload Resume PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-600 bg-base-800/40 p-8 text-center transition-all hover:border-accent-400/80 hover:bg-base-800/80">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-400 transition-transform group-hover:scale-110">
                  <FileText className="size-6" />
                </div>
                <p className="font-display text-sm font-semibold text-base-100">
                  {selectedFile ? selectedFile.name : 'Click or Drag & Drop Resume PDF'}
                </p>
                <p className="mt-1 text-xs text-base-400">Supports .pdf and .txt files up to 10MB</p>
                {selectedFile && (
                  <Badge variant="outline" size="sm" className="mt-3 border-accent-500/30 text-accent-300">
                    {Math.round(selectedFile.size / 1024)} KB
                  </Badge>
                )}
              </label>

              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-base-700/60" />
                <span className="absolute bg-base-900 px-3 text-xs text-base-400">or paste text</span>
              </div>

              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your resume text here (experience, skills, projects, education)..."
                rows={7}
                className="w-full resize-none rounded-xl border border-base-700/80 bg-base-950/60 p-3.5 text-xs text-base-100 placeholder:text-base-500 focus-ring"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleAnalyzeText}
                  loading={loading}
                  disabled={manualText.trim().length < 50}
                  className="flex-1"
                >
                  <Sparkles className="size-4" />
                  Analyze Text
                </Button>
                {analysis && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnalysis(null);
                      setSelectedFile(null);
                      setManualText('');
                    }}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border-base-700/60 bg-base-900/40 p-5">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-base-400">
              <Zap className="size-3.5 text-amber-400" />
              How Resume Analysis Works
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-base-300">
              <li className="flex items-start gap-2">
                <span className="text-accent-400">•</span>
                <span>Uses backend <strong>pypdf</strong> to decode raw PDF text streams accurately.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-400">•</span>
                <span>Scans across 25+ industry skill domains and high-impact action verbs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-400">•</span>
                <span>Directly formulates candidate-specific interview probing questions.</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Right Column: Analysis Results Area */}
        <div className="space-y-6 lg:col-span-7">
          {!analysis ? (
            <Card className="flex min-h-[460px] flex-col items-center justify-center border-dashed border-base-700/80 bg-base-900/30 p-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-base-800 text-base-400">
                <FileCheck className="size-8" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-base-200">No Resume Analyzed Yet</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-base-400">
                Upload your resume in PDF format on the left to unlock your ATS readiness score, extracted skills, and personalized interview questions.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* ATS Score Header Card */}
              <Card className="relative overflow-hidden border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-base-900/90 to-base-900 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" size="sm">ATS Optimization Score</Badge>
                      <span className="text-xs text-base-400">{analysis.word_count} words scanned</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-4xl font-bold tracking-tight text-base-50">
                        {analysis.ats_score}
                      </span>
                      <span className="text-sm font-semibold text-base-400">/ 100</span>
                      <span className="ml-2 text-xs font-medium text-emerald-400">
                        {analysis.ats_score >= 80 ? 'Excellent' : analysis.ats_score >= 65 ? 'Good Readiness' : 'Needs Optimization'}
                      </span>
                    </div>
                  </div>

                  <Button onClick={startInterviewWithResume} className="shrink-0">
                    <Briefcase className="size-4" />
                    Start Interview with this Resume
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-4">
                  <ProgressBar value={analysis.ats_score} max={100} tone="accent" />
                </div>

                {analysis.score_breakdown && (
                  <div className="mt-6 border-t border-base-700/60 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-base-400 mb-3">
                      ATS Score Breakdown (5 Industry Standard Pillars)
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                      <div className="rounded-xl border border-base-700/70 bg-base-950/60 p-2.5">
                        <span className="text-[11px] text-base-400 block">Sections</span>
                        <span className="font-display text-base font-bold text-base-100">
                          {analysis.score_breakdown.sections.score}
                          <span className="text-[10px] text-base-500 font-normal"> / 20</span>
                        </span>
                        <span className="block text-[10px] text-accent-300 mt-0.5 truncate">
                          {analysis.score_breakdown.sections.found?.length || 0}/4 detected
                        </span>
                      </div>

                      <div className="rounded-xl border border-base-700/70 bg-base-950/60 p-2.5">
                        <span className="text-[11px] text-base-400 block">Tech Skills</span>
                        <span className="font-display text-base font-bold text-base-100">
                          {analysis.score_breakdown.skills.score}
                          <span className="text-[10px] text-base-500 font-normal"> / 25</span>
                        </span>
                        <span className="block text-[10px] text-accent-300 mt-0.5 truncate">
                          {analysis.skills.length} matched
                        </span>
                      </div>

                      <div className="rounded-xl border border-base-700/70 bg-base-950/60 p-2.5">
                        <span className="text-[11px] text-base-400 block">Action Verbs</span>
                        <span className="font-display text-base font-bold text-base-100">
                          {analysis.score_breakdown.action_verbs.score}
                          <span className="text-[10px] text-base-500 font-normal"> / 20</span>
                        </span>
                        <span className="block text-[10px] text-emerald-400 mt-0.5 truncate">
                          {analysis.action_verbs.length} found
                        </span>
                      </div>

                      <div className="rounded-xl border border-base-700/70 bg-base-950/60 p-2.5">
                        <span className="text-[11px] text-base-400 block">Metrics & Data</span>
                        <span className="font-display text-base font-bold text-base-100">
                          {analysis.score_breakdown.metrics.score}
                          <span className="text-[10px] text-base-500 font-normal"> / 15</span>
                        </span>
                        <span className="block text-[10px] text-amber-400 mt-0.5 truncate">
                          {analysis.score_breakdown.metrics.count || 0} quantifiable
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 rounded-xl border border-base-700/70 bg-base-950/60 p-2.5">
                        <span className="text-[11px] text-base-400 block">Length/Density</span>
                        <span className="font-display text-base font-bold text-base-100">
                          {analysis.score_breakdown.length.score}
                          <span className="text-[10px] text-base-500 font-normal"> / 20</span>
                        </span>
                        <span className="block text-[10px] text-azure-400 mt-0.5 truncate">
                          {analysis.word_count} words
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Skills & Action Verbs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-base-300">
                      <Layers className="size-3.5 text-accent-400" />
                      Extracted Technical Skills
                    </h4>
                    <Badge variant="outline" size="sm">{analysis.skills.length} Found</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {analysis.skills.length > 0 ? (
                      analysis.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-200 border border-accent-500/20"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-base-500">No major keywords identified. Try adding standard skill terms.</span>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-base-300">
                      <TrendingUp className="size-3.5 text-emerald-400" />
                      High-Impact Action Verbs
                    </h4>
                    <Badge variant="outline" size="sm">{analysis.action_verbs.length} Found</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {analysis.action_verbs.length > 0 ? (
                      analysis.action_verbs.map((verb) => (
                        <span
                          key={verb}
                          className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20"
                        >
                          {verb}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-base-500">No strong action verbs detected.</span>
                    )}
                  </div>
                </Card>
              </div>

              {/* Strengths & Recommendations */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    Resume Strengths
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs text-base-300">
                    {analysis.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                    <AlertCircle className="size-3.5" />
                    ATS Optimization Tips
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs text-base-300">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">!</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Generated Interview Questions Preview */}
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-azure-400">
                    <HelpCircle className="size-3.5" />
                    Questions Generated From Your Projects & Skills
                  </h4>
                  <Badge variant="accent" size="sm">AI Tailored</Badge>
                </div>
                <div className="mt-3 space-y-2.5">
                  {analysis.suggested_questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-base-700/60 bg-base-950/40 p-3 text-xs leading-relaxed text-base-200"
                    >
                      <strong className="text-accent-300">Q{idx + 1}: </strong>
                      {q}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
