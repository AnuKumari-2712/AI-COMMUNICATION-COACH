import { apiClient } from './apiClient';
import type { AdminStudentRow, SkillDistributionPoint } from '@/types';

interface BackendOverview {
  total_students: number;
  active_users: number;
  practice_sessions: number;
  average_score: number;
  interview_sessions: number;
  improvement_rate: number;
}

interface BackendStudentRow {
  id: string;
  name: string;
  email: string;
  score: number;
  progress: number;
  last_active: string;
  status: string;
}

export const adminService = {
  getOverview: async () => {
    const { data } = await apiClient.get<BackendOverview>('/admin/overview');
    return {
      totalStudents: data.total_students,
      activeUsers: data.active_users,
      practiceSessions: data.practice_sessions,
      avgScore: data.average_score,
      interviewSessions: data.interview_sessions,
      improvementRate: data.improvement_rate,
    };
  },

  getGrowth: async (): Promise<{ month: string; users: number }[]> => {
    const { data } = await apiClient.get<{ month: string; users: number }[]>('/admin/growth');
    return data;
  },

  getActivity: async (): Promise<{ day: string; sessions: number }[]> => {
    const { data } = await apiClient.get<{ day: string; sessions: number }[]>('/admin/activity');
    return data;
  },

  getSkillDistribution: async (): Promise<SkillDistributionPoint[]> => {
    const { data } = await apiClient.get<SkillDistributionPoint[]>('/admin/skill-distribution');
    return data;
  },

  getStudents: async (): Promise<AdminStudentRow[]> => {
    const { data } = await apiClient.get<BackendStudentRow[]>('/admin/students');
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      score: s.score,
      progress: s.progress,
      lastActive: s.last_active,
      status: s.status as AdminStudentRow['status'],
    }));
  },
};

