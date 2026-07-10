import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type CurrentUser } from './api';
import { syncLibrary, clearLibrary } from './libraryStore';

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isDark ? 'dark' : 'light');
  } else {
    root.classList.add(theme);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setUser(null);
      // Clear invalid tokens from localStorage so the user is cleanly logged out
      api.auth.logout();
      clearLibrary();
    }
  };

  useEffect(() => {
    if (user?.settings?.theme) {
      applyTheme(user.settings.theme);
    } else {
      applyTheme('system');
    }
  }, [user]);

  useEffect(() => {
    const localTok = localStorage.getItem('access_token');
    if (localTok === 'demo') {
      refreshUser().finally(() => setLoading(false));
      return;
    }

    api.auth.refresh()
      .then((success) => {
        if (success) {
          return refreshUser().then(() => syncLibrary());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    await api.auth.login(username, password);
    await refreshUser();
    await syncLibrary();
  };

  const register = async (username: string, email: string, password: string) => {
    await api.auth.register(username, email, password);
    await refreshUser();
    await syncLibrary();
  };

  const logout = () => {
    api.auth.logout();
    clearLibrary();
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
