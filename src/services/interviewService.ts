import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import { interviewCategories } from '@/data/mockData';
import { getCurrentStudentId } from '@/lib/auth';
import { audioFileName } from '@/lib/audioToWav';
import { performClientTextAnalysis, performClientVoiceAnalysis } from '@/lib/clientAnalysis';
import type { InterviewCategory } from '@/types';

interface StoredSessionAnswer {
  questionId: string;
  questionText: string;
  transcript: string;
  grammar: number;
  vocabulary: number;
  fluency: number;
  confidence: number;
  clarity: number;
  structure: number;
  relevance: number;
  pace: number;
  fillerWordCount: number;
  mostFrequentFiller: string | null;
}

const sessionAnswersMap = new Map<string, StoredSessionAnswer[]>();

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
      sessionAnswersMap.set(data.session_id, []);
      return {
        sessionId: data.session_id,
        categoryId: data.category_id,
        questions: data.questions.map((q) => ({ id: q.id, text: q.text })),
        source: 'real',
      };
    } catch {
      localSessionCounter += 1;
      const sessionId = `local-${localSessionCounter}`;
      sessionAnswersMap.set(sessionId, []);
      const questions = (questionBank[categoryId] ?? questionBank.hr).map((text, i) => ({ id: `${sessionId}-q${i}`, text }));
      return mockDelay({ sessionId, categoryId, questions, source: 'mock' as const }, 300);
    }
  },

  /**
   * Transcribes the recorded answer and scores it against the interview question.
   * If the backend is unreachable, evaluates the candidate's actual speech
   * and timing dynamically using client-side analysis.
   */
  answerQuestion: async (
    session: InterviewSession,
    questionId: string,
    audioBlob: Blob | undefined,
    durationSeconds: number,
    browserTranscript?: string,
  ): Promise<AnswerFeedback> => {
    if (session.source === 'real' && audioBlob) {
      try {
        const form = new FormData();
        form.append('duration_seconds', String(durationSeconds));
        form.append('audio', audioBlob, audioFileName(audioBlob, 'answer'));
        if (browserTranscript?.trim()) form.append('transcript', browserTranscript.trim());
        const { data: voice } = await apiClient.post<{ transcript: string; source: 'real' | 'mock'; fluency_score: number; pause_count: number; pace_source: string }>('/assessment/voice', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (voice.source !== 'real') throw new Error('Speech-to-text unavailable — falling back to client evaluation.');

        const { data } = await apiClient.post<BackendAnswerResponse>('/interview/answer', {
          session_id: session.sessionId,
          question_id: questionId,
          answer_text: voice.transcript,
          mode: 'voice',
          duration_seconds: durationSeconds,
          ...(voice.pace_source === 'measured'
            ? { speech_fluency_score: voice.fluency_score, speech_pause_count: voice.pause_count }
            : {}),
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
        // fall through to dynamic client evaluation below
      }
    }

    const qObj = session.questions.find((q) => q.id === questionId);
    const qText = qObj?.text || 'Interview question';
    const cleanTranscript = (browserTranscript || '').trim();

    const voiceRes = performClientVoiceAnalysis(durationSeconds, cleanTranscript, cleanTranscript ? 'browser' : 'sample');
    const textRes = cleanTranscript ? performClientTextAnalysis(qText, cleanTranscript) : null;

    let dynamicFeedback = 'Solid answer overall.';
    if (!cleanTranscript) {
      dynamicFeedback = 'No speech was detected. Please check microphone permissions and speak clearly.';
    } else if (voiceRes.fillerWordCount > 2) {
      dynamicFeedback = `Good response, but watch out for filler words like "${voiceRes.mostFrequentFiller || 'um'}" (${voiceRes.fillerWordCount} detected). Practice pausing silently instead.`;
    } else if (textRes && textRes.relevanceScore < 50) {
      dynamicFeedback = 'Try addressing the question more directly — be sure to highlight key outcomes and specific examples.';
    } else if (voiceRes.wordsPerMinute > 170) {
      dynamicFeedback = `Your delivery was slightly rushed (${voiceRes.wordsPerMinute} wpm). Aim for a steady 130-160 wpm for maximum impact.`;
    } else if (voiceRes.wordsPerMinute < 100 && voiceRes.wordsPerMinute > 0) {
      dynamicFeedback = `Pacing was somewhat hesitant (${voiceRes.wordsPerMinute} wpm). Practice delivering complete thoughts without long pauses.`;
    } else if (textRes && textRes.structureScore > 75) {
      dynamicFeedback = 'Well-structured answer with clear framing and relevant details. Great delivery!';
    }

    const answerRecord: StoredSessionAnswer = {
      questionId,
      questionText: qText,
      transcript: cleanTranscript,
      grammar: textRes ? textRes.grammarScore : voiceRes.grammarScore,
      vocabulary: textRes ? textRes.vocabularyScore : voiceRes.vocabularyScore,
      fluency: voiceRes.fluencyScore,
      confidence: voiceRes.confidenceScore,
      clarity: textRes ? textRes.clarityScore : 72,
      structure: textRes ? textRes.structureScore : 68,
      relevance: textRes ? textRes.relevanceScore : 75,
      pace: voiceRes.paceScore,
      fillerWordCount: voiceRes.fillerWordCount,
      mostFrequentFiller: voiceRes.mostFrequentFiller,
    };

    const existingAnswers = sessionAnswersMap.get(session.sessionId) || [];
    existingAnswers.push(answerRecord);
    sessionAnswersMap.set(session.sessionId, existingAnswers);

    return mockDelay(
      {
        grammar: answerRecord.grammar,
        vocabulary: answerRecord.vocabulary,
        fluency: answerRecord.fluency,
        confidence: answerRecord.confidence,
        clarity: answerRecord.clarity,
        structure: answerRecord.structure,
        fillerWordCount: answerRecord.fillerWordCount,
        feedback: dynamicFeedback,
      },
      500,
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
        // fall through to dynamic client summary below
      }
    }

    const answers = sessionAnswersMap.get(session.sessionId) || [];
    if (answers.length > 0) {
      const avg = (fn: (a: StoredSessionAnswer) => number) =>
        Math.round(answers.reduce((sum, a) => sum + fn(a), 0) / answers.length);

      const grammar = avg((a) => a.grammar);
      const vocabulary = avg((a) => a.vocabulary);
      const fluency = avg((a) => a.fluency);
      const confidence = avg((a) => a.confidence);
      const clarity = avg((a) => a.clarity);
      const structure = avg((a) => a.structure);
      const totalFillers = answers.reduce((sum, a) => sum + a.fillerWordCount, 0);

      const overall = Math.round((grammar + vocabulary + fluency + confidence + clarity + structure) / 6);
      const communication = Math.round((clarity + fluency + structure) / 3);

      const wentWell: string[] = [];
      const needsImprovement: string[] = [];
      const recommendedExercises: string[] = [];

      if (confidence >= 70) wentWell.push('Maintained a confident, professional communication tone.');
      if (totalFillers <= 2 * answers.length) wentWell.push('Demonstrated strong fluency with low filler word frequency.');
      if (structure >= 70) wentWell.push('Responses had clear narrative structure and progression.');
      if (clarity >= 70) wentWell.push('Explanations were articulate and easy to follow.');
      if (wentWell.length === 0) wentWell.push('Completed all interview questions with genuine persistence.');

      if (totalFillers > 2 * answers.length) {
        needsImprovement.push('Noticeable filler words detected across several answers — practice intentional silent pauses.');
        recommendedExercises.push('Practice Pacing & Filler Word Drills in Voice Practice');
      }
      if (structure < 70) {
        needsImprovement.push('Use the STAR framework (Situation, Task, Action, Result) for behavioral answers.');
        recommendedExercises.push('Practice STAR Storytelling in Fluency Practice');
      }
      if (vocabulary < 75) {
        needsImprovement.push('Incorporate more domain-specific vocabulary and strong action verbs.');
        recommendedExercises.push('Complete Vocabulary Flashcard Drills');
      }
      if (needsImprovement.length === 0) {
        needsImprovement.push('Continue practicing under timed pressure to maintain this high standard.');
        recommendedExercises.push('Simulate Advanced Mock Interview rounds');
      }

      return mockDelay(
        {
          overall,
          communication,
          confidence,
          clarity,
          grammar,
          vocabulary,
          structure,
          fluency,
          wentWell,
          needsImprovement,
          recommendedExercises,
        },
        800,
      );
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
      800,
    );
  },
};
