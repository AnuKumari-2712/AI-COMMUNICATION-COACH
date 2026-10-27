import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1',
  // 60 s, not 15 s: on Render's free plan the backend sleeps after ~15 min idle and
  // takes 30-60 s to wake. A 15 s timeout made the first request after a pause fail,
  // which silently switched the whole app to "Demo data — backend offline". A backend
  // that is genuinely down (connection refused) still fails immediately.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface SystemHealth {
  status: string;
  use_mock_ai: boolean;
  spacy_model_loaded: boolean;
  transformer_confidence_enabled: boolean;
  engines?: {
    claude: boolean;
    t5: boolean;
    whisper: boolean;
    spacy: boolean;
  };
}

export async function getBackendHealth(): Promise<SystemHealth> {
  const res = await apiClient.get<SystemHealth>('/health', { timeout: 8000 });
  return res.data;
}

/**
 * Fire-and-forget request sent when the app loads so a sleeping backend starts waking
 * up while the user is still on the landing/login page, instead of on their first
 * real action. Failure is ignored on purpose.
 */
export function wakeBackend(): void {
  void apiClient.get('/health', { timeout: 90000 }).catch(() => undefined);
}

