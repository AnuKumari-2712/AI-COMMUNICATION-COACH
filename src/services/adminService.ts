import { mockDelay } from './mockDelay';
import { adminStudents, adminGrowth, adminActivity, skillDistribution } from '@/data/mockData';

export const adminService = {
  getOverview: () =>
    mockDelay(
      {
        totalStudents: 2140,
        activeUsers: 1486,
        practiceSessions: 18420,
        avgScore: 71,
        interviewSessions: 3240,
        improvementRate: 24,
      },
      450,
    ),
  getGrowth: () => mockDelay(adminGrowth, 400),
  getActivity: () => mockDelay(adminActivity, 400),
  getSkillDistribution: () => mockDelay(skillDistribution, 400),
  getStudents: () => mockDelay(adminStudents, 500),
};
