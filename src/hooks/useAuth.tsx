import { createContext, useContext, useState, type ReactNode } from 'react';
import { currentStudent } from '@/data/mockData';
import type { StudentProfile } from '@/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  student: StudentProfile;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('auth_token') !== null,
  );

  const login = () => {
    localStorage.setItem('auth_token', 'mock_jwt_token');
    setIsAuthenticated(true);
  };
  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, student: currentStudent, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
