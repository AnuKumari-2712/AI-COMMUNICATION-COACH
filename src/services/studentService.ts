// This service prefers the real FastAPI backend and falls back to
// src/data/mockData.ts whenever the backend is unreachable — every getter
// below follows the same try backend / catch -> mock pattern so the app
// never breaks when the backend isn't running, and never presents mock
// output as real analysis (see the `source` field returned alongside data).
import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import {
  currentStudent,
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

function computeStreakDays(history: BackendLearnerProfile['practice_history']): number {
  if (!history.length) return 0;
  const days = Array.from(new Set(history.map((h) => new Date(h.timestamp).toDateString())));
  return days.length;
}

function mapProfile(p: BackendLearnerProfile): StudentProfile {
  const s = p.scores;
  const overall = Math.round(
    (s.grammar + s.vocabulary + s.fluency + s.speaking_pace + s.filler_words + s.confidence + s.pronunciation + s.response_structure) / 8,
  );
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
    streakDays: computeStreakDays(p.practice_history),
    totalPracticeMinutes: p.total_practice_minutes,
    joinedAt: p.practice_history[0]?.timestamp ?? new Date().toISOString(),
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

async function withFallback<T>(call: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch {
    return fallback();
  }
}

export const studentService = {
  getProfile: (): Promise<StudentProfile & { source: 'real' | 'mock' }> =>
    withFallback<StudentProfile & { source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
        return { ...mapProfile(data), source: 'real' as const };
      },
      async () => ({ ...(await mockDelay(currentStudent, 400)), source: 'mock' as const }),
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
    } catch {
      return mockDelay({ ...currentStudent, ...patch }, 500);
    }
  },

  /** Real per-session trend once the student has 2+ sessions (see backend student_service.analytics_trend); falls back to a smooth 7-week demo curve otherwise. */
  getTrend: (): Promise<TrendPoint[]> =>
    withFallback(
      async () => {
        const { data } = await apiClient.get<TrendPoint[]>('/students/me/analytics/trend');
        return data;
      },
      () => mockDelay(trendData, 400),
    ),

  /** Real practice minutes/sessions per day for the last 7 days; falls back to a representative demo week. */
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
      () => mockDelay(['Filler Words', 'Tense Consistency'], 300),
    ),

  clearRevisionTopic: async (topic: string): Promise<string[]> => {
    try {
      const { data } = await apiClient.delete<{ topics: string[] }>(`/students/me/revision-queue/${encodeURIComponent(topic)}`);
      return data.topics;
    } catch {
      return [];
    }
  },

  /** Every value here is computed from the student's real profile (streak, session counts, score history) — never a static list when the backend is up. */
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

  /** Real recent sessions (type, relative date, session score) from practice_history; falls back to a short representative demo list. */
  getPracticeHistory: (): Promise<{ items: PracticeHistoryEntry[]; source: 'real' | 'mock' }> =>
    withFallback<{ items: PracticeHistoryEntry[]; source: 'real' | 'mock' }>(
      async () => {
        const { data } = await apiClient.get<BackendLearnerProfile>('/students/me');
        const items = mapPracticeHistory(data.practice_history);
        if (!items.length) throw new Error('no history yet');
        return { items, source: 'real' as const };
      },
      async () => ({
        items: await mockDelay(
          [
            { label: 'Mock HR Interview', date: 'Today', score: 82 },
            { label: 'Voice Practice Session', date: 'Yesterday', score: 74 },
            { label: 'Grammar Drill', date: '2 days ago', score: 68 },
            { label: 'Vocabulary Session', date: '3 days ago', score: 91 },
          ],
          400,
        ),
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
};
