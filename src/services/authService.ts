import axios from 'axios';
import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import { currentStudent } from '@/data/mockData';

/**
 * True only when the backend genuinely couldn't be reached (down, wrong
 * URL, network error) — as opposed to responding with a real rejection
 * like 401 Unauthorized or 409 Conflict. Only the former should fall back
 * to a mock "success"; a wrong password must surface as a real error, not
 * be silently waved through.
 */
function isBackendUnreachable(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

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

export interface AuthResult {
  token: string;
  /** 'real' = a genuine backend account was created/authenticated, so the student now sees their own profile, not the shared demo one. */
  source: 'real' | 'mock';
}

interface BackendAuthResponse {
  access_token: string;
  student_id: string;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResult> => {
    try {
      const { data } = await apiClient.post<BackendAuthResponse>('/auth/login', payload);
      return { token: data.access_token, source: 'real' };
    } catch (error) {
      if (!isBackendUnreachable(error)) throw error; // wrong email/password — let the caller show a real error
      return { ...(await mockDelay({ token: 'mock_jwt_token' }, 700)), source: 'mock' };
    }
  },

  signup: async (payload: SignupPayload): Promise<AuthResult> => {
    try {
      const { data } = await apiClient.post<BackendAuthResponse>('/auth/signup', {
        full_name: payload.fullName,
        email: payload.email,
        password: payload.password,
        college: payload.college,
        course: payload.course,
        year: payload.year,
        career_goal: payload.careerGoal,
      });
      return { token: data.access_token, source: 'real' };
    } catch (error) {
      if (!isBackendUnreachable(error)) throw error; // e.g. email already registered
      return { ...(await mockDelay({ token: 'mock_jwt_token' }, 900)), source: 'mock' };
    }
  },

  loginWithGoogle: () => mockDelay({ token: 'mock_jwt_token', student: currentStudent }, 900),

  logout: () => {
    localStorage.removeItem('auth_token');
    return mockDelay(true, 200);
  },

  /** Throws with a real backend message (wrong current password, demo account, etc.) — never silently "succeeds". */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
  },
};
