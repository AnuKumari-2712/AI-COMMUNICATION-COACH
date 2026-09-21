import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import { interviewCategories } from '@/data/mockData';
import { getCurrentStudentId } from '@/lib/auth';
import type { InterviewCategory } from '@/types';

export interface InterviewResult {
  overall: number;
  communication: number;
  confidence: number;
  clarity: number;
  grammar: number;
  vocabulary: number;
  structure: number;
  fluency: number;
  wentWell: string[];
  needsImprovement: string[];
  recommendedExercises: string[];
}

export interface InterviewQuestion {
  id: string;
  text: string;
}

export interface InterviewSession {
  sessionId: string;
  categoryId: string;
  questions: InterviewQuestion[];
  source: 'real' | 'mock';
}

export interface AnswerFeedback {
  grammar: number;
  vocabulary: number;
  fluency: number;
  confidence: number;
  clarity: number;
  structure: number;
  fillerWordCount: number;
  feedback: string;
}

interface BackendCategory {
  id: string;
  title: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  difficulty: string;
}

interface BackendStartResponse {
  session_id: string;
  category_id: string;
  questions: { id: string; text: string; stage: string }[];
}

interface BackendAnswerResponse {
  grammar_score: number;
  vocabulary_score: number;
  fluency_score: number;
  confidence_score: number;
  clarity_score: number;
  structure_score: number;
  filler_word_count: number;
  feedback: string;
}

interface BackendResultResponse {
  overall: number;
  communication: number;
  confidence: number;
  clarity: number;
  grammar: number;
  vocabulary: number;
  structure: number;
  fluency: number;
  went_well: string[];
  needs_improvement: string[];
  recommended_exercises: string[];
}

const questionBank: Record<string, string[]> = {
  hr: ['Tell me about yourself.', 'Why do you want to join our company?', 'Where do you see yourself in 5 years?'],
  technical: ['Explain how a hash map works.', 'How would you design a URL shortener?', 'What is the difference between SQL and NoSQL?'],
  behavioral: ['Describe a time you handled conflict in a team.', 'Tell me about a failure and what you learned.', 'Describe a time you led a project.'],
  resume: ['Walk me through this project on your resume.', 'Why did you choose this internship?', 'What was your specific contribution here?'],
  mock: ['Tell me about yourself.', 'Explain a technical concept simply.', 'Describe a challenge you overcame.'],
};

let localSessionCounter = 0;

export const interviewService = {
  getCategories: async (): Promise<InterviewCategory[]> => {
    try {
      const { data } = await apiClient.get<BackendCategory[]>('/interview/categories');
      return data.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        questions: c.question_count,
        duration: `${c.duration_minutes} min`,
        difficulty: c.difficulty as InterviewCategory['difficulty'],
      }));
    } catch {
      return mockDelay(interviewCategories, 350);
    }
  },

  /** Extracts text from an uploaded resume file (PDF or plain text) via the backend parser. */
  uploadResume: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('resume', file);
    const { data } = await apiClient.post<{ resume_text: string }>('/interview/resume-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.resume_text;
  },

  /** Starts a real backend interview session (question bank + resume/job-role generation). Falls back to a local, session-less question list. */
  startSession: async (categoryId: string, options?: { resumeText?: string; jobRole?: string }): Promise<InterviewSession> => {
    try {
      const { data } = await apiClient.post<BackendStartResponse>('/interview/start', {
        student_id: getCurrentStudentId(),
        category_id: categoryId,
        resume_text: options?.resumeText,
        job_role: options?.jobRole,
      });
      return {
        sessionId: data.session_id,
        categoryId: data.category_id,
        questions: data.questions.map((q) => ({ id: q.id, text: q.text })),
        source: 'real',
      };
    } catch {
      localSessionCounter += 1;
      const sessionId = `local-${localSessionCounter}`;
      const questions = (questionBank[categoryId] ?? questionBank.hr).map((text, i) => ({ id: `${sessionId}-q${i}`, text }));
      return mockDelay({ sessionId, categoryId, questions, source: 'mock' as const }, 300);
    }
  },

  /**
   * Transcribes the recorded answer (via the voice-assessment endpoint,
   * reused here purely for its transcript) and scores it against the
   * interview question. Falls back to a synthetic transcript + canned
   * feedback if the backend or STT isn't available — the session still
   * completes either way.
   */
  answerQuestion: async (session: InterviewSession, questionId: string, audioBlob: Blob | undefined, durationSeconds: number): Promise<AnswerFeedback> => {
    if (session.source === 'real' && audioBlob) {
      try {
        const form = new FormData();
        form.append('duration_seconds', String(durationSeconds));
        form.append('audio', audioBlob, 'answer.webm');
        const { data: voice } = await apiClient.post<{ transcript: string }>('/assessment/voice', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { data } = await apiClient.post<BackendAnswerResponse>('/interview/answer', {
          session_id: session.sessionId,
          question_id: questionId,
          answer_text: voice.transcript,
          mode: 'voice',
          duration_seconds: durationSeconds,
        });
        return {
          grammar: data.grammar_score,
          vocabulary: data.vocabulary_score,
          fluency: data.fluency_score,
          confidence: data.confidence_score,
          clarity: data.clarity_score,
          structure: data.structure_score,
          fillerWordCount: data.filler_word_count,
          feedback: data.feedback,
        };
      } catch {
        // fall through to mock feedback below
      }
    }
    return mockDelay(
      {
        grammar: 70 + Math.round(Math.random() * 15),
        vocabulary: 68 + Math.round(Math.random() * 15),
        fluency: 65 + Math.round(Math.random() * 15),
        confidence: 66 + Math.round(Math.random() * 15),
        clarity: 70 + Math.round(Math.random() * 15),
        structure: 62 + Math.round(Math.random() * 15),
        fillerWordCount: Math.round(Math.random() * 4),
        feedback: 'Solid answer overall.',
      },
      600,
    );
  },

  submitInterview: async (session: InterviewSession): Promise<InterviewResult> => {
    if (session.source === 'real') {
      try {
        const { data } = await apiClient.post<BackendResultResponse>('/interview/submit', { session_id: session.sessionId });
        return {
          overall: data.overall,
          communication: data.communication,
          confidence: data.confidence,
          clarity: data.clarity,
          grammar: data.grammar,
          vocabulary: data.vocabulary,
          structure: data.structure,
          fluency: data.fluency,
          wentWell: data.went_well,
          needsImprovement: data.needs_improvement,
          recommendedExercises: data.recommended_exercises,
        };
      } catch {
        // fall through to mock result below
      }
    }
    return mockDelay(
      {
        overall: 78,
        communication: 76,
        confidence: 71,
        clarity: 80,
        grammar: 74,
        vocabulary: 79,
        structure: 68,
        fluency: 70,
        wentWell: [
          'Clear and structured introduction',
          'Good use of specific examples with metrics',
          'Maintained a confident tone throughout',
        ],
        needsImprovement: [
          'Answers to behavioral questions lacked the STAR structure',
          'Noticeable filler words during technical explanations',
          'Slightly rushed pace in the last two answers',
        ],
        recommendedExercises: [
          'Practice STAR-format storytelling in Fluency Practice',
          'Complete 2 more Behavioral Interview simulations',
          'Try the pacing drill in Voice Practice',
        ],
      },
      1600,
    );
  },
};
