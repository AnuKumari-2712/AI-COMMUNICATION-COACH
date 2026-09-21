import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { currentStudent } from '@/data/mockData';
import { studentService } from '@/services/studentService';
import type { StudentProfile } from '@/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  student: StudentProfile;
  /** Pass the real access_token from authService.login/signup when the backend call succeeded, so subsequent requests authenticate as that student rather than the shared demo profile. */
  login: (token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('auth_token') !== null,
  );
  const [student, setStudent] = useState<StudentProfile>(currentStudent);

  const refreshStudent = () => {
    studentService.getProfile().then(setStudent);
  };

  useEffect(() => {
    if (isAuthenticated) refreshStudent();
  }, [isAuthenticated]);

  const login = (token?: string) => {
    localStorage.setItem('auth_token', token ?? 'mock_jwt_token');
    setIsAuthenticated(true);
    refreshStudent();
  };
  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setStudent(currentStudent);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, student, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
