import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { studentService } from '@/services/studentService';
import type { StudentProfile } from '@/types';

/** Null = not yet fetched; never fall back to mock profile for authenticated users. */
type AuthStudent = StudentProfile | null;

interface AuthContextValue {
  isAuthenticated: boolean;
  /** The real profile once loaded; null while loading or when unauthenticated. */
  student: AuthStudent;
  /** Whether we're currently fetching the profile from the backend. */
  profileLoading: boolean;
  /** Error message if the backend returned an error fetching the profile. */
  profileError: string | null;
  /** Pass the real access_token from authService.login/signup when the backend call succeeded. */
  login: (token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('auth_token') !== null,
  );
  const [student, setStudent] = useState<AuthStudent>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshStudent = (token?: string) => {
    // If a fresh token was just stored, give it a tick before the interceptor picks it up.
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const profile = await studentService.getProfileReal();
        setStudent(profile);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load profile. Please try again.';
        setProfileError(message);
        setStudent(null);
      } finally {
        setProfileLoading(false);
      }
    };
    void fetchProfile();
    void token; // unused — token is already in localStorage by the time this runs
  };

  useEffect(() => {
    if (isAuthenticated) refreshStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const login = (token?: string) => {
    localStorage.setItem('auth_token', token ?? '');
    setIsAuthenticated(true);
    refreshStudent(token);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setStudent(null);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, student, profileLoading, profileError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
