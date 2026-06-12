import {
  MOCK_USER, MOCK_TRACKS, MOCK_ARTISTS, MOCK_ALBUMS,
  MOCK_PLAYLISTS, MOCK_CONCERTS,
} from './mockData';

const BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? 'http://localhost:8002/api'
  : '/api';

let _demoMode = false;

function getToken() {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && localStorage.getItem('refresh_token')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return true;
  } catch {
    return false;
  }
}

async function tryRequest<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch {
    _demoMode = true;
    throw new Error('demo');
  }
}

export const isDemoMode = () => _demoMode;
export const setDemoMode = (v: boolean) => { _demoMode = v; };

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      if (username === 'demo' || username === 'Demo') {
        _demoMode = true;
        return { access: 'demo', refresh: 'demo' };
      }
      try {
        return await request<{ access: string; refresh: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
      } catch (e: unknown) {
        if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('Failed'))) {
          _demoMode = true;
          return { access: 'demo', refresh: 'demo' };
        }
        throw e;
      }
    },
    register: async (username: string, email: string, password: string) => {
      if (_demoMode) return { access: 'demo', refresh: 'demo' };
      try {
        return await request<{ access: string; refresh: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        });
      } catch (e: unknown) {
        if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('Failed'))) {
          _demoMode = true;
          return { access: 'demo', refresh: 'demo' };
        }
        throw e;
      }
    },
    me: async (): Promise<CurrentUser> => {
      if (_demoMode || localStorage.getItem('access_token') === 'demo') {
        return MOCK_USER;
      }
      return request<CurrentUser>('/auth/me');
    },
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      _demoMode = false;
    },
    updateSettings: async (settings: Partial<UserSettings>) => {
      if (_demoMode) return settings;
      return request('/settings', { method: 'PATCH', body: JSON.stringify(settings) });
    },
  },
  tracks: async (): Promise<Track[]> => {
    if (_demoMode) return MOCK_TRACKS;
    return tryRequest<Track[]>('/tracks');
  },
  artists: async (): Promise<Artist[]> => {
    if (_demoMode) return MOCK_ARTISTS;
    return tryRequest<Artist[]>('/artists');
  },
  albums: async (): Promise<Album[]> => {
    if (_demoMode) return MOCK_ALBUMS;
    return tryRequest<Album[]>('/albums');
  },
  playlists: async (): Promise<Playlist[]> => {
    if (_demoMode) return MOCK_PLAYLISTS;
    return tryRequest<Playlist[]>('/playlists');
  },
  concerts: async (): Promise<Concert[]> => {
    if (_demoMode) return MOCK_CONCERTS;
    return tryRequest<Concert[]>('/concerts');
  },
  audioUrl: (filename: string) => `${BASE}/media/music/${filename}`,
};

export interface UserSettings {
  language: 'ru' | 'kk' | 'en';
  theme: 'system' | 'light' | 'dark';
  audioQuality: 'auto' | 'high' | 'saver';
  autoplay: boolean;
  notificationsEnabled: boolean;
  privateProfile: boolean;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  isStaff: boolean;
  displayName: string;
  bio: string;
  city: string;
  settings: UserSettings;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  plays: number;
  cover?: string;
  coverUrl?: string;
  genre: string;
  language: string;
  audioFile?: string;
  audioUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  genre: string;
  country: string;
  city: string;
  image: string;
  followers: number;
  tracks: Track[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  tracks: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  type: 'editorial' | 'thematic' | 'user';
  tracks: Track[];
  creator?: string;
}

export interface Concert {
  id: string;
  artist: string;
  venue: string;
  date: string;
  time: string;
  city: string;
  ticketPrice: number;
  image: string;
}
