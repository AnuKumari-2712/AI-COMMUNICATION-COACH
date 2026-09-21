import { mockDelay } from './mockDelay';
import { currentStudent } from '@/data/mockData';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  college: string;
  course: string;
  year: string;
  careerGoal: string;
}

export const authService = {
  login: (_payload: LoginPayload) =>
    mockDelay({ token: 'mock_jwt_token', student: currentStudent }, 900),
  signup: (_payload: SignupPayload) =>
    mockDelay({ token: 'mock_jwt_token', student: currentStudent }, 1100),
  loginWithGoogle: () => mockDelay({ token: 'mock_jwt_token', student: currentStudent }, 900),
  logout: () => {
    localStorage.removeItem('auth_token');
    return mockDelay(true, 200);
  },
};
