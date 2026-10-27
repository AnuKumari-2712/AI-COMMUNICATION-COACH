// This service has two modes:
//   REAL mode (logged-in user): every getter calls the backend and throws on
//     failure — mock data is NEVER returned for a logged-in user.
//   DEMO mode (no auth token): every getter falls back to src/data/mockData.ts
//     with a clearly labelled "mock" source, so the app is usable as a demo
//     for visitors who haven't signed up yet.
import axios from 'axios';
import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import {
  skillDistribution,
  trendData,
  weeklyActivity,
  todaysPlan,
  weekPlan,
  strengths,
  improvementAreas,
  recommendations,
} from '@/data/mockData';
import { achievements as mockAchievements } from '@/data/mockData';
import type { Achievement, DayPlan, PlanTask, SkillDistributionPoint, StudentProfile, TrendPoint, WeeklyActivityPoint } from '@/types';

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

interface BackendLearnerProfile {
  student_id: string;
  full_name: string;
  email: string;
  college: string;
  course: string;
  year: string;
  career_goal: string;
  current_level: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Advanced';
  scores: BackendSkillScores;
  weaknesses: string[];
  strengths: string[];
  revision_queue: string[];
  practice_history: { type: string; scores: Record<string, number>; timestamp: string }[];
  streak_days: number;
  total_practice_minutes: number;
}

interface BackendPlanTask {
  type: PlanTask['type'];
  title: string;
  minutes: number;
  skill: string;
  difficulty: string;
}

interface BackendDailyPlan {
  difficulty: string;
  mean_score: number;
  trend: number;
  weaknesses: string[];
  strengths: string[];
  tasks: BackendPlanTask[];
}

interface BackendWeekDay {
  day: string;
  focus: string;
  tasks: BackendPlanTask[];
}

interface BackendWeaknessReport {
  mean_score: number;
  weaknesses: { skill: string; label: string; score: number }[];
  strengths: { skill: string; label: string; score: number }[];
  weakness_labels: string[];
  strength_labels: string[];
}

interface BackendRecommendation {
  title: string;
  type: string;
  reason: string;
}

const LEVEL_MAP: Record<BackendLearnerProfile['current_level'], StudentProfile['currentLevel']> = {
  Beginner: 'Beginner',
  Easy: 'Beginner',
  Medium: 'Intermediate',
  Hard: 'Advanced',
  Advanced: 'Advanced',
};

const TARGET_MAP: Record<StudentProfile['currentLevel'], StudentProfile['targetLevel']> = {
  Beginner: 'Intermediate',
  Intermediate: 'Advanced',
  Advanced: 'Expert',
};

export interface PracticeHistoryEntry {
  label: string;
  date: string;
  score: number;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  text_practice: 'Text Practice Session',
  voice_practice: 'Voice Practice Session',
  interview: 'Mock Interview',
  initial_assessment: 'Initial Communication Assessment',
};

function formatRelativeDate(timestamp: string): string {
  const then = new Date(timestamp);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapPracticeHistory(history: BackendLearnerProfile['practice_history']): PracticeHistoryEntry[] {
  return [...history]
    .reverse()
    .map((h) => {
      const values = Object.values(h.scores ?? {});
      const score = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return { label: SESSION_TYPE_LABELS[h.type] ?? h.type, date: formatRelativeDate(h.timestamp), score };
    })
    .slice(0, 8);
}

function mapProfile(p: BackendLearnerProfile): StudentProfile {
  const s = p.scores;
  const values = [s.grammar, s.vocabulary, s.fluency, s.speaking_pace, s.filler_words, s.confidence, s.pronunciation, s.response_structure];
  const activeValues = values.filter((v) => v > 0);
  const overall = activeValues.length > 0 ? Math.round(activeValues.reduce((a, b) => a + b, 0) / activeValues.length) : 0;
  const currentLevel = LEVEL_MAP[p.current_level] ?? 'Intermediate';

  return {
    id: p.student_id,
    name: p.full_name,
    email: p.email,
    college: p.college,
    course: p.course,
    year: p.year,
    careerGoal: p.career_goal,
    currentLevel,
    targetLevel: TARGET_MAP[currentLevel],
    streakDays: p.streak_days,
    totalPracticeMinutes: p.total_practice_minutes,
    joinedAt: p.practice_history[0]?.timestamp ?? new Date().toISOString(),
    exercisesCompleted: p.practice_history.length,
    scores: {
      overall,
      grammar: s.grammar,
      vocabulary: s.vocabulary,
      fluency: s.fluency,
      pronunciation: s.pronunciation,
      confidence: s.confidence,
      speakingPace: s.speaking_pace,
      fillerWords: s.filler_words,
      structure: s.response_structure,
    },
  };
}

function mapTask(t: BackendPlanTask, index: number): PlanTask {
  return { id: `${t.skill}-${index}`, title: t.title, type: t.type, minutes: t.minutes, done: false };
}

function mapDailyPlan(plan: BackendDailyPlan): DayPlan {
  return {
    day: 'Today',
    date: new Date().toISOString(),
    focus: plan.weaknesses[0] ?? 'General Communication',
    tasks: plan.tasks.map(mapTask),
  };
}

function mapWeekPlan(days: BackendWeekDay[]): DayPlan[] {
  return days.map((d, i) => ({
    day: d.day,
    date: new Date(Date.now() + i * 86400000).toISOString(),
    focus: d.focus,
    tasks: d.tasks.map(mapTask),
  }));
}

/** Returns true when the user has an auth token in localStorage (i.e. they're logged in). */
function isLoggedIn(): boolean {
  return !!localStorage.getItem('auth_token');
}

/**
 * Extracts a human-readable error message from an Axios error or generic error.
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
    if (!error.response) return 'Backend is unreachable. Please check your connection.';
    return `Backend error ${error.response.status}: ${error.response.statusText}`;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

/**
 * withFallback — ONLY falls back to mock when the user is NOT logged in.
 * For logged-in users, errors are re-thrown so the UI can show a real error.
 */
async function withFallback<T>(call: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (isLoggedIn()) {
      // Re-throw so callers can show the real error message, not silently serve mock data.
      throw err;
    }
    // Unauthenticated demo mode: silent fallback is acceptable.
    return fallback();
  }
}

export const studentService = {
  /**
   * Fetch the real profile from the backend.
   * Throws on any backend error — never returns mock data.
   * Used by useAuth for logged-in users.
   */
  getProfileReal: async (): Promise<StudentProfile> => {
    const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
    return mapProfile(data);
  },

  getProfile: (): Promise<StudentProfile & { source: 'real' | 'mock' }> =>
    withFallback<StudentProfile & { source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
        return { ...mapProfile(data), source: 'real' as const };
      },
      async () => {
        // Demo mode only: return the named demo profile.
        const mockProfile: StudentProfile = {
          id: 'demo-student',
          name: 'Demo Student',
          email: 'demo@example.com',
          college: 'Sample University',
          course: 'B.Tech Computer Science',
          year: '3rd Year',
          careerGoal: 'Software Engineer',
          currentLevel: 'Intermediate',
          targetLevel: 'Advanced',
          streakDays: 0,
          totalPracticeMinutes: 0,
          joinedAt: new Date().toISOString(),
          scores: {
            overall: 0,
            grammar: 0,
            vocabulary: 0,
            fluency: 0,
            pronunciation: 0,
            confidence: 0,
            speakingPace: 0,
            fillerWords: 0,
            structure: 0,
          },
        };
        return { ...(await mockDelay(mockProfile, 400)), source: 'mock' as const };
      },
    ),

  updateProfile: async (patch: Partial<StudentProfile>): Promise<StudentProfile> => {
    try {
      const { data } = await apiClient.patch<BackendLearnerProfile>('/students/me', {
        full_name: patch.name,
        college: patch.college,
        course: patch.course,
        year: patch.year,
        career_goal: patch.careerGoal,
      });
      return mapProfile(data);
    } catch (err) {
      if (isLoggedIn()) throw err;
      return mockDelay({ id: 'demo-student', name: 'Demo Student', email: '', college: '', course: '', year: '', careerGoal: '', currentLevel: 'Intermediate', targetLevel: 'Advanced', streakDays: 0, totalPracticeMinutes: 0, joinedAt: new Date().toISOString(), scores: { overall: 0, grammar: 0, vocabulary: 0, fluency: 0, pronunciation: 0, confidence: 0, speakingPace: 0, fillerWords: 0, structure: 0 }, ...patch }, 500);
    }
  },

  /** Real per-session trend once the student has 2+ sessions; 404 → fallback to demo curve for unauthenticated visitors only. */
  getTrend: (): Promise<TrendPoint[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<TrendPoint[]>('/students/me/analytics/trend');
        return data;
      },
      () => mockDelay(trendData, 400),
    ),

  /** Real practice minutes/sessions per day for the last 7 days; 404 → fallback for unauthenticated visitors only. */
  getWeeklyActivity: (): Promise<WeeklyActivityPoint[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<WeeklyActivityPoint[]>('/students/me/analytics/activity');
        return data;
      },
      () => mockDelay(weeklyActivity, 400),
    ),

  getRevisionQueue: (): Promise<string[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<{ topics: string[] }>('/students/me/revision-queue');
        return data.topics;
      },
      () => mockDelay([], 300),
    ),

  clearRevisionTopic: async (topic: string): Promise<string[]> => {
    try {
      const { data } = await apiClient.delete<{ topics: string[] }>(`/students/me/revision-queue/${encodeURIComponent(topic)}`);
      return data.topics;
    } catch {
      return [];
    }
  },

  /** Every value here is computed from the student's real profile. */
  getAchievements: (): Promise<{ items: Achievement[]; source: 'real' | 'mock' }> =>
    withFallback<{ items: Achievement[]; source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<Achievement[]>('/students/me/achievements');
        return { items: data, source: 'real' as const };
      },
      async () => ({ items: await mockDelay(mockAchievements, 400), source: 'mock' as const }),
    ),

  markWordLearned: async (word: string): Promise<void> => {
    try {
      await apiClient.post(`/students/me/vocabulary/learned/${encodeURIComponent(word)}`);
    } catch {
      // learned state still updates locally in the UI even if this fails
    }
  },

  /** Real recent sessions; for unauthenticated visitors falls back to a short demo list. */
  getPracticeHistory: (): Promise<{ items: PracticeHistoryEntry[]; source: 'real' | 'mock' }> =>
    withFallback<{ items: PracticeHistoryEntry[]; source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
        const items = mapPracticeHistory(data.practice_history);
        return { items, source: 'real' as const };
      },
      async () => ({
        items: await mockDelay([], 400),
        source: 'mock' as const,
      }),
    ),

  getSkillDistribution: (): Promise<SkillDistributionPoint[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
        const s = data.scores;
        return [
          { skill: 'Grammar', value: s.grammar, fullMark: 100 },
          { skill: 'Vocabulary', value: s.vocabulary, fullMark: 100 },
          { skill: 'Fluency', value: s.fluency, fullMark: 100 },
          { skill: 'Pronunciation', value: s.pronunciation, fullMark: 100 },
          { skill: 'Confidence', value: s.confidence, fullMark: 100 },
          { skill: 'Pace', value: s.speaking_pace, fullMark: 100 },
        ];
      },
      () => mockDelay(skillDistribution, 400),
    ),

  getTodaysPlan: (): Promise<DayPlan & { source: 'real' | 'mock' }> =>
    withFallback<DayPlan & { source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<BackendDailyPlan>('/students/me/plan/today');
        return { ...mapDailyPlan(data), source: 'real' as const };
      },
      async () => ({ ...(await mockDelay(todaysPlan, 350)), source: 'mock' as const }),
    ),

  getWeekPlan: (): Promise<DayPlan[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<BackendWeekDay[]>('/students/me/plan/week');
        return mapWeekPlan(data);
      },
      () => mockDelay(weekPlan, 400),
    ),

  getAnalysisInsights: (): Promise<{ strengths: string[]; improvementAreas: string[]; recommendations: string[]; source: 'real' | 'mock' }> =>
    withFallback<{ strengths: string[]; improvementAreas: string[]; recommendations: string[]; source: 'real' | 'mock' }>(
      async () => {
        const [{ data: report }, { data: rec }] = await Promise.all([
          apiClient.get<BackendWeaknessReport>('/students/me/weaknesses'),
          apiClient.get<BackendRecommendation>('/students/me/recommendation'),
        ]);
        return {
          strengths: report.strengths.length
            ? report.strengths.map((s) => `${s.label} is a strength (${s.score}/100)`)
            : ['No standout strengths yet — keep practicing to build one.'],
          improvementAreas: report.weaknesses.length
            ? report.weaknesses.map((w) => `${w.label} needs attention (currently ${w.score}/100)`)
            : ['No significant weaknesses detected — great consistency.'],
          recommendations: [`${rec.title} — ${rec.reason}`],
          source: 'real' as const,
        };
      },
      async () => {
        await mockDelay(null, 400);
        return { strengths, improvementAreas, recommendations, source: 'mock' as const };
      },
    ),

  /** Extracts an error message from a caught error for display in the UI. */
  extractErrorMessage,
};
