import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'Admin' | 'SRE' | 'Developer' | 'Viewer') => Promise<void>;
  isAdmin: boolean;
  isSRE: boolean;
  isDev: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canApprove: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('rollback_audit_token');
    const savedUser = localStorage.getItem('rollback_audit_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('rollback_audit_token');
        localStorage.removeItem('rollback_audit_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('rollback_audit_token', res.token);
    localStorage.setItem('rollback_audit_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('rollback_audit_token');
    localStorage.removeItem('rollback_audit_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const quickLogin = async (role: 'Admin' | 'SRE' | 'Developer' | 'Viewer') => {
    const creds: Record<string, { email: string; pass: string }> = {
      Admin: { email: 'admin@example.com', pass: 'Admin@123' },
      SRE: { email: 'sre@example.com', pass: 'Sre@123' },
      Developer: { email: 'developer@example.com', pass: 'Developer@123' },
      Viewer: { email: 'viewer@example.com', pass: 'Viewer@123' },
    };
    const c = creds[role];
    if (c) {
      await login(c.email, c.pass);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isSRE = role === 'SRE';
  const isDev = role === 'DEVELOPER';
  const isViewer = role === 'VIEWER';
  const canEdit = isAdmin || isSRE || isDev;
  const canApprove = isAdmin || isSRE;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        quickLogin,
        isAdmin,
        isSRE,
        isDev,
        isViewer,
        canEdit,
        canApprove,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
