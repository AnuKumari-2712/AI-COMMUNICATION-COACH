import { useEffect, useState } from 'react';

/**
 * Same shape as useState, but persisted to localStorage — used for
 * per-device preferences (notification toggles, voice settings, language)
 * that should survive a reload without needing a backend round-trip.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing, quota) — preference just won't persist
    }
  }, [key, value]);

  return [value, setValue] as const;
}
