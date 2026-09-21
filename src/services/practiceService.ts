import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import { vocabWords, grammarQuestions } from '@/data/mockData';
import type { GrammarQuestion, VocabWord } from '@/types';

export interface VoiceAnalysisResult {
  grammar: number;
  fluency: number;
  pronunciation: number;
  pace: number;
  fillerWordCount: number;
  confidence: number;
  transcript: string;
}

export interface TextAnalysisResult {
  score: number;
  corrections: { original: string; corrected: string; reason: string }[];
  vocabularySuggestions: string[];
  betterAlternative: string;
  /** 'real' = analyzed by the FastAPI backend's NLP pipeline, 'mock' = local demo data (backend not running). */
  source: 'real' | 'mock';
}

const DEMO_STUDENT_ID = 'demo-student';

function mockTextAnalysis(text: string): TextAnalysisResult {
  return {
    score: Math.max(45, Math.min(96, 60 + Math.round(text.length / 12))),
    corrections: [
      { original: 'their going to the interview', corrected: "they're going to the interview", reason: "Use \"they're\" (they are) instead of the possessive \"their\"." },
      { original: 'i has experience', corrected: 'I have experience', reason: 'Subject-verb agreement: use "have" with "I".' },
    ],
    vocabularySuggestions: ['Consider "demonstrate" instead of "show" for a more formal tone.', '"Facilitate" can replace "help with" in professional contexts.'],
    betterAlternative:
      'I have hands-on experience leading cross-functional teams, which helped me deliver the project two weeks ahead of schedule.',
    source: 'mock',
  };
}

interface BackendTextAnalysisResponse {
  score: number;
  corrections: { original: string; corrected: string; reason: string; rule: string }[];
  vocabulary_suggestions: string[];
  better_alternative: string;
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

interface BackendVoiceAnalysisResponse {
  transcript: string;
  grammar_score: number;
  fluency_score: number;
  pronunciation_score: number;
  confidence_score: number;
  pace_score: number;
  filler_word_count: number;
}

export const practiceService = {
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
   * + speech-metrics analysis. Browsers record webm/opus, which the
   * backend's pause/silence analyzer can't parse as WAV (no ffmpeg
   * dependency here — see README §6), so the STT step itself typically
   * falls back to a labeled mock transcript; the grammar/vocabulary/
   * confidence scoring that runs on top of it is still real.
   */
  analyzeVoiceRecording: async (durationSec: number, audioBlob?: Blob): Promise<VoiceAnalysisResult> => {
    if (audioBlob) {
      try {
        const form = new FormData();
        form.append('duration_seconds', String(durationSec));
        form.append('audio', audioBlob, 'recording.webm');
        const { data } = await apiClient.post<BackendVoiceAnalysisResponse>('/assessment/voice', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return {
          grammar: data.grammar_score,
          fluency: data.fluency_score,
          pronunciation: data.pronunciation_score,
          pace: data.pace_score,
          fillerWordCount: data.filler_word_count,
          confidence: data.confidence_score,
          transcript: data.transcript,
        };
      } catch {
        // fall through to mock below
      }
    }
    return mockDelay(
      {
        grammar: 68 + Math.round(Math.random() * 10),
        fluency: 60 + Math.round(Math.random() * 15),
        pronunciation: 75 + Math.round(Math.random() * 10),
        pace: 58 + Math.round(Math.random() * 15),
        fillerWordCount: 3 + Math.round(Math.random() * 5),
        confidence: 62 + Math.round(Math.random() * 15),
        transcript:
          "So, um, I think the biggest challenge in my last project was, like, coordinating between the frontend and backend teams because we didn't have, um, a shared timeline initially.",
      },
      1400,
    );
  },

  /**
   * Calls the real FastAPI + spaCy grammar/vocabulary analysis backend.
   * Falls back to local mock data if the backend isn't running, per the
   * requirement that mock data must be used (and clearly labeled) whenever
   * a real service is unavailable — never silently presented as real.
   */
  analyzeText: async (question: string, answer: string): Promise<TextAnalysisResult> => {
    try {
      const { data } = await apiClient.post<BackendTextAnalysisResponse>('/assessment/text', {
        student_id: DEMO_STUDENT_ID,
        question,
        answer,
      });
      return {
        score: data.score,
        corrections: data.corrections.map((c) => ({ original: c.original, corrected: c.corrected, reason: c.reason })),
        vocabularySuggestions: data.vocabulary_suggestions,
        betterAlternative: data.better_alternative,
        source: 'real',
      };
    } catch {
      return mockDelay(mockTextAnalysis(answer), 900);
    }
  },
};
