import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CurrentUser } from '../types';
import {
  hasStoredAuthTokens,
  login as loginRequest,
  logout as logoutRequest,
  me,
  register as registerRequest,
  updateMe,
} from '../api/client';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  register: (payload: { username: string; email?: string; password: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: {
    username: string;
    email?: string;
    display_name?: string;
    bio?: string;
    city?: string;
  }) => Promise<CurrentUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!hasStoredAuthTokens()) {
        setLoading(false);
        return;
      }

      try {
        const current = await me();
        if (mounted) setUser(current);
      } catch {
        logoutRequest();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      async login(payload) {
        const current = await loginRequest(payload);
        setUser(current);
      },
      async register(payload) {
        const current = await registerRequest(payload);
        setUser(current);
      },
      async refreshUser() {
        const current = await me();
        setUser(current);
      },
      async updateProfile(payload) {
        const current = await updateMe(payload);
        setUser(current);
        return current;
      },
      logout() {
        logoutRequest();
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
