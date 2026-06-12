import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type CurrentUser } from './api';

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { access, refresh } = await api.auth.login(username, password);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await refreshUser();
  };

  const register = async (username: string, email: string, password: string) => {
    const { access, refresh } = await api.auth.register(username, email, password);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await refreshUser();
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
