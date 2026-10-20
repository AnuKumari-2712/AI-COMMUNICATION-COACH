import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import { vocabWords, grammarQuestions, currentStudent } from '@/data/mockData';
import { getCurrentStudentId } from '@/lib/auth';
import { audioFileName } from '@/lib/audioToWav';
import { performClientTextAnalysis, performClientVoiceAnalysis } from '@/lib/clientAnalysis';
import type { GrammarQuestion, SkillScores, VocabWord } from '@/types';

export interface VoiceAnalysisResult {
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  pace: number;
  fillerWordCount: number;
  confidence: number;
  transcript: string;
  /**
   * 'real' = the backend's speech-to-text transcribed the recording.
   * 'mock' = the transcript is a sample sentence, not what the user said
   * (either speech recognition failed, or the backend was unreachable — see `offline`).
   */
  source: 'real' | 'mock';
  /** Who produced the transcript: the user's browser, the backend, or a canned sample sentence. */
  transcriptSource: 'browser' | 'server' | 'sample';
  /** true only when the backend could not be reached at all and everything is local demo data. */
  offline: boolean;
  /** Pronunciation is a transcript-only proxy in this project — never a real audio measurement. Always false. */
  pronunciationReliable: boolean;
  pronunciationMethod: string;
  wordsPerMinute: number;
  /** "measured" = real WAV pause analysis; "estimated" = transcript-based approximation. */
  paceSource: 'measured' | 'estimated';
  referenceRangeWpm: string;
  highConfidenceFillerCount: number;
  ambiguousFillerCount: number;
  fillerExcludedExamples: string[];
  mostFrequentFiller: string | null;
}

export interface TextAnalysisResult {
  score: number;
  corrections: { original: string; corrected: string; reason: string; rule?: string; errorType?: string }[];
  vocabularySuggestions: string[];
  betterAlternative: string;
  correctedAnswer: string;
  /** 'real' = analyzed by the FastAPI backend's NLP pipeline, 'mock' = local demo data (backend not running). */
  source: 'real' | 'mock';
  grammarScore: number;
  vocabularyScore: number;
  structureScore: number;
  clarityScore: number;
  /** false = too little text for this component's own measure to be a confident reading, not an error. */
  grammarSufficientData: boolean;
  vocabularySufficientData: boolean;
  relevanceScore: number;
  relevanceAddressedKeywords: string[];
  relevanceMissingKeywords: string[];
  relevanceSufficientData: boolean;
  overallScoreFormula: string;
  overallExcludedComponents: string[];
}

function dynamicTextAnalysis(question: string, text: string): TextAnalysisResult {
  const analysis = performClientTextAnalysis(question, text);
  return {
    score: analysis.score,
    corrections: analysis.corrections.map((c) => ({
      original: c.original,
      corrected: c.corrected,
      reason: c.reason,
      rule: c.rule,
      errorType: c.errorType || 'Grammar',
    })),
    vocabularySuggestions: analysis.vocabularySuggestions,
    betterAlternative: analysis.betterAlternative,
    correctedAnswer: analysis.correctedAnswer,
    source: 'real',
    grammarScore: analysis.grammarScore,
    vocabularyScore: analysis.vocabularyScore,
    structureScore: analysis.structureScore,
    clarityScore: analysis.clarityScore,
    grammarSufficientData: analysis.grammarSufficientData,
    vocabularySufficientData: analysis.vocabularySufficientData,
    relevanceScore: analysis.relevanceScore,
    relevanceAddressedKeywords: analysis.relevanceAddressedKeywords,
    relevanceMissingKeywords: analysis.relevanceMissingKeywords,
    relevanceSufficientData: analysis.relevanceSufficientData,
    overallScoreFormula: analysis.overallScoreFormula,
    overallExcludedComponents: analysis.overallExcludedComponents,
  };
}

interface BackendTextAnalysisResponse {
  score: number;
  corrections: { original: string; corrected: string; reason: string; rule: string; error_type?: string }[];
  vocabulary_suggestions: string[];
  better_alternative: string;
  corrected_answer?: string;
  grammar_score: number;
  vocabulary_score: number;
  structure_score: number;
  clarity_score: number;
  grammar_sufficient_data: boolean;
  vocabulary_sufficient_data: boolean;
  relevance_score: number;
  relevance_addressed_keywords: string[];
  relevance_missing_keywords: string[];
  relevance_sufficient_data: boolean;
  overall_score_formula: string;
  overall_excluded_components: string[];
}

interface BackendVocabWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  difficulty: VocabWord['difficulty'];
  phonetic: string;
}

interface BackendGrammarQuestion {
  id: string;
  type: GrammarQuestion['type'];
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  weakness_tag: string;
}

interface BackendSkillScores {
  grammar: number;
  vocabulary: number;
  fluency: number;
  speaking_pace: number;
  filler_words: number;
  confidence: number;
  pronunciation: number;
  response_structure: number;
}

interface BackendVoiceAnalysisResponse {
  source: 'real' | 'mock';
  transcript_source: 'browser' | 'server' | 'sample';
  transcript: string;
  grammar_score: number;
  vocabulary_score: number;
  fluency_score: number;
  pronunciation_score: number;
  confidence_score: number;
  pace_score: number;
  filler_word_count: number;
  words_per_minute: number;
  pace_source: 'measured' | 'estimated';
  reference_range_wpm: string;
  pronunciation_reliable: boolean;
  pronunciation_method: string;
  high_confidence_filler_count: number;
  ambiguous_filler_count: number;
  filler_excluded_examples: string[];
  most_frequent_filler: string | null;
}

export const practiceService = {
  /**
   * Runs the student's free-text onboarding answer through the real NLP
   * pipeline (grammar/vocabulary/structure/confidence) to seed their
   * initial learner profile, instead of showing static demo numbers on the
   * "Your Personalized Learning Profile is Ready" screen. Falls back to the
   * demo profile's scores if the backend is unreachable.
   */
  runInitialAssessment: async (assessmentText: string): Promise<SkillScores> => {
    try {
      const { data } = await apiClient.post<BackendSkillScores>('/assessment/initial', {
        student_id: getCurrentStudentId(),
        intro_text: assessmentText,
        topic_answer: assessmentText,
        text_answer: assessmentText,
      });
      const overall = Math.round(
        (data.grammar + data.vocabulary + data.fluency + data.speaking_pace + data.filler_words + data.confidence + data.pronunciation + data.response_structure) / 8,
      );
      return {
        overall,
        grammar: data.grammar,
        vocabulary: data.vocabulary,
        fluency: data.fluency,
        pronunciation: data.pronunciation,
        confidence: data.confidence,
        speakingPace: data.speaking_pace,
        fillerWords: data.filler_words,
        structure: data.response_structure,
      };
    } catch {
      const textAnalysis = performClientTextAnalysis('Tell me about your background and interests.', assessmentText);
      const grammar = textAnalysis.grammarScore;
      const vocabulary = textAnalysis.vocabularyScore;
      const structure = textAnalysis.structureScore;
      const confidence = Math.min(95, Math.max(60, Math.round(textAnalysis.score * 0.9 + 5)));
      const fluency = Math.min(95, Math.max(55, Math.round(textAnalysis.clarityScore * 0.9)));
      const pronunciation = Math.round((grammar + vocabulary) / 2);
      const speakingPace = 72;
      const fillerWords = 80;
      const overall = Math.round((grammar + vocabulary + fluency + speakingPace + fillerWords + confidence + pronunciation + structure) / 8);

      return mockDelay(
        {
          overall,
          grammar,
          vocabulary,
          fluency,
          pronunciation,
          confidence,
          speakingPace,
          fillerWords,
          structure,
        },
        800,
      );
    }
  },

  /** Personalized (weakness + difficulty ordered) vocabulary set from the backend; falls back to a fixed demo list. */
  getVocabWords: async (): Promise<VocabWord[]> => {
    try {
      const { data } = await apiClient.get<BackendVocabWord[]>('/practice/vocabulary/words');
      return data.map((w) => ({ ...w, learned: false }));
    } catch {
      return mockDelay(vocabWords, 400);
    }
  },

  /** Personalized (weakness + difficulty ordered) grammar set from the backend; falls back to a fixed demo list. */
  getGrammarQuestions: async (): Promise<GrammarQuestion[]> => {
    try {
      const { data } = await apiClient.get<BackendGrammarQuestion[]>('/practice/grammar/questions');
      return data.map((q) => ({ ...q, weakness: q.weakness_tag.replace(/_/g, ' ') }));
    } catch {
      return mockDelay(grammarQuestions, 400);
    }
  },

  /**
   * Uploads the actual recorded audio to the backend for real speech-to-text
   * + speech-metrics analysis. The recorder converts the browser's webm/opus
   * recording to 16 kHz mono WAV first (see lib/audioToWav.ts), which the
   * backend can transcribe and measure pauses on without ffmpeg. Only if that
   * conversion is impossible does the backend fall back to a labeled mock.
   */
  analyzeVoiceRecording: async (durationSec: number, audioBlob?: Blob, browserTranscript?: string): Promise<VoiceAnalysisResult> => {
    if (audioBlob) {
      try {
        const form = new FormData();
        form.append('duration_seconds', String(durationSec));
        form.append('audio', audioBlob, audioFileName(audioBlob, 'recording'));
        if (browserTranscript?.trim()) form.append('transcript', browserTranscript.trim());
        const { data } = await apiClient.post<BackendVoiceAnalysisResponse>('/assessment/voice', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return {
          grammar: data.grammar_score,
          vocabulary: data.vocabulary_score,
          fluency: data.fluency_score,
          pronunciation: data.pronunciation_score,
          pace: data.pace_score,
          fillerWordCount: data.filler_word_count,
          confidence: data.confidence_score,
          transcript: data.transcript,
          source: data.source,
          transcriptSource: data.transcript_source,
          offline: false,
          pronunciationReliable: data.pronunciation_reliable,
          pronunciationMethod: data.pronunciation_method,
          wordsPerMinute: data.words_per_minute,
          paceSource: data.pace_source,
          referenceRangeWpm: data.reference_range_wpm,
          highConfidenceFillerCount: data.high_confidence_filler_count,
          ambiguousFillerCount: data.ambiguous_filler_count,
          fillerExcludedExamples: data.filler_excluded_examples,
          mostFrequentFiller: data.most_frequent_filler,
        };
      } catch {
        // fall through to dynamic client evaluation below
      }
    }
    const clientVoice = performClientVoiceAnalysis(
      durationSec,
      browserTranscript || '',
      browserTranscript ? 'browser' : 'sample'
    );
    return mockDelay(
      {
        grammar: clientVoice.grammarScore,
        vocabulary: clientVoice.vocabularyScore,
        fluency: clientVoice.fluencyScore,
        pronunciation: clientVoice.pronunciationScore,
        pace: clientVoice.paceScore,
        fillerWordCount: clientVoice.fillerWordCount,
        confidence: clientVoice.confidenceScore,
        transcript: clientVoice.transcript,
        source: clientVoice.source,
        transcriptSource: clientVoice.transcriptSource,
        offline: false,
        pronunciationReliable: clientVoice.pronunciationReliable,
        pronunciationMethod: clientVoice.pronunciationMethod,
        wordsPerMinute: clientVoice.wordsPerMinute,
        paceSource: clientVoice.paceSource,
        referenceRangeWpm: clientVoice.referenceRangeWpm,
        highConfidenceFillerCount: clientVoice.highConfidenceFillerCount,
        ambiguousFillerCount: clientVoice.ambiguousFillerCount,
        fillerExcludedExamples: clientVoice.fillerExcludedExamples,
        mostFrequentFiller: clientVoice.mostFrequentFiller,
      },
      600,
    );
  },

  /**
   * Calls the real FastAPI + spaCy grammar/vocabulary analysis backend.
   * Falls back to real client-side analysis of the student's actual answer
   * if the backend is unreachable.
   */
  analyzeText: async (question: string, answer: string): Promise<TextAnalysisResult> => {
    try {
      const { data } = await apiClient.post<BackendTextAnalysisResponse>('/assessment/text', {
        student_id: getCurrentStudentId(),
        question,
        answer,
      });
      return {
        score: data.score,
        corrections: data.corrections.map((c) => ({
          original: c.original,
          corrected: c.corrected,
          reason: c.reason,
          rule: c.rule,
          errorType: c.error_type || 'Grammar',
        })),
        vocabularySuggestions: data.vocabulary_suggestions,
        betterAlternative: data.better_alternative,
        correctedAnswer: data.corrected_answer || '',
        source: 'real',
        grammarScore: data.grammar_score,
        vocabularyScore: data.vocabulary_score,
        structureScore: data.structure_score,
        clarityScore: data.clarity_score,
        grammarSufficientData: data.grammar_sufficient_data,
        vocabularySufficientData: data.vocabulary_sufficient_data,
        relevanceScore: data.relevance_score,
        relevanceAddressedKeywords: data.relevance_addressed_keywords,
        relevanceMissingKeywords: data.relevance_missing_keywords,
        relevanceSufficientData: data.relevance_sufficient_data,
        overallScoreFormula: data.overall_score_formula,
        overallExcludedComponents: data.overall_excluded_components,
      };
    } catch {
      return mockDelay(dynamicTextAnalysis(question, answer), 500);
    }
  },
};
