/**
 * BackendStatusBanner — displayed while the Render free-tier backend is waking up
 * from its cold start (can take 30-60 s after 15 min idle).
 *
 * Strategy:
 * 1. On mount, fire a /health check.
 * 2. If it fails within 3 s, assume the backend is sleeping → show "waking up" banner.
 * 3. Retry every 8 s until the backend responds, then hide the banner.
 */
import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

import type { SystemHealth } from '@/services/apiClient';

type Status = 'checking' | 'waking' | 'ready' | 'error';

export function BackendStatusBanner() {
  const [status, setStatus] = useState<Status>('checking');
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [dismissedReady, setDismissedReady] = useState(false);
  const isReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await apiClient.get<SystemHealth>('/health', { timeout: 8000 });
        if (!cancelled) {
          setHealthData(res.data);
          isReadyRef.current = true;
          setStatus('ready');
        }
      } catch {
        if (!cancelled && !isReadyRef.current) setStatus('waking');
      }
    };

    void check();

    // Retry every 5 s while waking.
    const interval = setInterval(async () => {
      if (isReadyRef.current) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await apiClient.get<SystemHealth>('/health', { timeout: 8000 });
        if (!cancelled) {
          setHealthData(res.data);
          isReadyRef.current = true;
          setStatus('ready');
          clearInterval(interval);
        }
      } catch {
        if (!cancelled && !isReadyRef.current) setStatus('waking');
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Auto-dismiss the "ready" banner after 5 s.
  useEffect(() => {
    if (status === 'ready') {
      const t = setTimeout(() => setDismissedReady(true), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (status === 'checking') return null;
  if (status === 'ready' && dismissedReady) return null;

  if (status === 'ready') {
    const activeEngines: string[] = [];
    if (healthData?.engines) {
      if (healthData.engines.spacy) activeEngines.push('spaCy');
      if (healthData.engines.whisper) activeEngines.push('Whisper');
      if (healthData.engines.claude) activeEngines.push('Claude');
      if (healthData.engines.t5) activeEngines.push('T5');
    }

    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-success-500/20 px-4 py-2.5 text-xs text-success-300 shadow-soft-lg backdrop-blur-md border border-success-500/20">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
        <span>
          <strong>Backend online</strong>
          {activeEngines.length > 0
            ? ` • Real AI (${activeEngines.join(', ')})`
            : healthData?.use_mock_ai === false
            ? ' • Honest AI Mode'
            : ''}
        </span>
      </div>
    );
  }

  if (status === 'waking') {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-warning-500/15 px-4 py-2.5 text-xs text-warning-200 shadow-soft-lg backdrop-blur-md border border-warning-500/20 max-w-xs">
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        <span>
          {isLocal ? (
            <>
              <strong>Connecting to local backend...</strong> Checking server on port 8000.
            </>
          ) : (
            <>
              <strong>Backend is waking up</strong> (Render free plan — may take up to 60 s). Login and signup will work once it's ready.
            </>
          )}
        </span>
      </div>
    );
  }

  // status === 'error'
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-danger-500/15 px-4 py-2.5 text-xs text-danger-200 shadow-soft-lg backdrop-blur-md border border-danger-500/20 max-w-xs">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span>Backend unreachable — check your connection or VITE_API_BASE_URL.</span>
    </div>
  );
}
