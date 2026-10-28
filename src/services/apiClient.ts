import axios from 'axios';

function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost';
    const isIp = window.location.hostname === '127.0.0.1';
    if (envUrl) {
      if (isLocalhost && envUrl.includes('127.0.0.1')) {
        return envUrl.replace('127.0.0.1', 'localhost');
      }
      if (isIp && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '127.0.0.1');
      }
      return envUrl;
    }
    return isLocalhost ? 'http://localhost:8000/api/v1' : 'http://127.0.0.1:8000/api/v1';
  }
  return envUrl || 'http://127.0.0.1:8000/api/v1';
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
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

