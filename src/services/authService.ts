import { apiClient } from './apiClient';

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
  /** 'real' = a genuine backend account was created/authenticated. */
  source: 'real';
}

interface BackendAuthResponse {
  access_token: string;
  student_id: string;
}

export const authService = {
  /**
   * Login — always talks to the real backend.
   * Any error (wrong password, network failure, server down) is thrown
   * so the caller can show the real error message. Never silently
   * "succeeds" with mock data.
   */
  login: async (payload: LoginPayload): Promise<AuthResult> => {
    const { data } = await apiClient.post<BackendAuthResponse>('/auth/login', payload);
    return { token: data.access_token, source: 'real' };
  },

  /**
   * Signup — always talks to the real backend.
   * Any error (email already registered, network failure) is thrown.
   */
  signup: async (payload: SignupPayload): Promise<AuthResult> => {
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
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  /** Throws with a real backend message (wrong current password, etc.) — never silently "succeeds". */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
  },
};
