import {
  MOCK_USER, MOCK_TRACKS, MOCK_ARTISTS, MOCK_ALBUMS,
  MOCK_PLAYLISTS, MOCK_CONCERTS,
} from './mockData';

const BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? 'http://127.0.0.1:8002/api'
  : '/api';

let _demoMode = false;

function getToken() {
  return localStorage.getItem('access_token');
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  Object.assign(headers, options.headers);

  // Do not send Authorization header for login and register requests
  if (token && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
  } catch (e: any) {
    if (e.message === 'demo') {
      _demoMode = true;
      throw e;
    }
    // Fallback if the connection failed
    if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('Failed'))) {
      _demoMode = true;
      throw new Error('demo');
    }
    throw e;
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
    updateProfile: async (formData: FormData): Promise<CurrentUser> => {
      if (_demoMode || localStorage.getItem('access_token') === 'demo') {
        MOCK_USER.displayName = String(formData.get('display_name') || MOCK_USER.displayName);
        MOCK_USER.bio = String(formData.get('bio') || MOCK_USER.bio);
        MOCK_USER.city = String(formData.get('city') || MOCK_USER.city);
        return MOCK_USER;
      }
      const token = getToken();
      const res = await fetch(`${BASE}/auth/me`, {
        method: 'PATCH',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    forgotPassword: async (email: string): Promise<any> => {
      if (_demoMode) return { success: true };
      return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    resetPassword: async (token: string, password: string): Promise<any> => {
      if (_demoMode) return { success: true };
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
    },
  },
  tracks: async (params?: { page?: number; page_size?: number; genre?: string; status?: string }): Promise<any> => {
    if (_demoMode) return MOCK_TRACKS;
    return tryRequest<any>(`/tracks${buildQuery(params)}`);
  },
  artists: async (params?: { page?: number; page_size?: number; genre?: string }): Promise<any> => {
    if (_demoMode) return MOCK_ARTISTS;
    return tryRequest<any>(`/artists${buildQuery(params)}`);
  },
  albums: async (params?: { page?: number; page_size?: number }): Promise<any> => {
    if (_demoMode) return MOCK_ALBUMS;
    return tryRequest<any>(`/albums${buildQuery(params)}`);
  },
  playlists: (() => {
    const fn = async (params?: { page?: number; page_size?: number }): Promise<any> => {
      if (_demoMode) return MOCK_PLAYLISTS;
      return tryRequest<any>(`/playlists${buildQuery(params)}`);
    };
    fn.create = async (name: string, description: string, isPublic: boolean): Promise<Playlist> => {
      if (_demoMode) {
        const newPl: Playlist = {
          id: String(Date.now()),
          name,
          description,
          cover: '',
          type: 'user',
          tracks: [],
          creator: 'demo',
          user: 999,
          is_public: isPublic,
        };
        MOCK_PLAYLISTS.push(newPl);
        return newPl;
      }
      return request<Playlist>('/playlists/create', {
        method: 'POST',
        body: JSON.stringify({ name, description, is_public: isPublic }),
      });
    };
    fn.update = async (id: string, data: Partial<Playlist> & { is_public?: boolean }): Promise<Playlist> => {
      if (_demoMode) {
        const pl = MOCK_PLAYLISTS.find(p => String(p.id) === String(id));
        if (pl) Object.assign(pl, data);
        return pl!;
      }
      const mappedData = {
        name: data.name,
        description: data.description,
        is_public: data.is_public,
        cover: data.cover,
      };
      return request<Playlist>(`/playlists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(mappedData),
      });
    };
    fn.delete = async (id: string): Promise<void> => {
      if (_demoMode) {
        const idx = MOCK_PLAYLISTS.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) MOCK_PLAYLISTS.splice(idx, 1);
        return;
      }
      return request<void>(`/playlists/${id}`, {
        method: 'DELETE',
      });
    };
    fn.addTrack = async (playlistId: string, trackId: string): Promise<Playlist> => {
      if (_demoMode) {
        const pl = MOCK_PLAYLISTS.find(p => String(p.id) === String(playlistId));
        const tr = MOCK_TRACKS.find(t => String(t.id) === String(trackId));
        if (pl && tr && !pl.tracks.some(t => String(t.id) === String(trackId))) {
          pl.tracks.push(tr);
        }
        return pl!;
      }
      return request<Playlist>(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add', track_id: trackId }),
      });
    };
    fn.removeTrack = async (playlistId: string, trackId: string): Promise<Playlist> => {
      if (_demoMode) {
        const pl = MOCK_PLAYLISTS.find(p => String(p.id) === String(playlistId));
        if (pl) pl.tracks = pl.tracks.filter(t => String(t.id) !== String(trackId));
        return pl!;
      }
      return request<Playlist>(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ action: 'remove', track_id: trackId }),
      });
    };
    fn.reorderTrack = async (playlistId: string, trackId: string, order: number): Promise<Playlist> => {
      if (_demoMode) {
        const pl = MOCK_PLAYLISTS.find(p => String(p.id) === String(playlistId));
        if (pl) {
          const idx = pl.tracks.findIndex(t => String(t.id) === String(trackId));
          if (idx !== -1) {
            const [track] = pl.tracks.splice(idx, 1);
            pl.tracks.splice(order - 1, 0, track);
          }
        }
        return pl!;
      }
      return request<Playlist>(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reorder', track_id: trackId, order }),
      });
    };
    return fn;
  })(),
  concerts: (() => {
    const fn = async (params?: { page?: number; page_size?: number }): Promise<any> => {
      if (_demoMode) return MOCK_CONCERTS;
      return tryRequest<any>(`/concerts${buildQuery(params)}`);
    };
    fn.purchase = async (id: string, email: string, phone: string): Promise<any> => {
      if (_demoMode) return { success: true, tickets_available: 9, tickets_sold: 1 };
      return request<any>(`/concerts/${id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ email, phone }),
      });
    };
    return fn;
  })(),
  artist: async (id: string): Promise<Artist> => {
    if (_demoMode) {
      const found = MOCK_ARTISTS.find(a => String(a.id) === String(id));
      if (!found) throw new Error('Artist not found');
      return found;
    }
    return request<Artist>(`/artists/${id}`);
  },
  album: async (id: string): Promise<Album> => {
    if (_demoMode) {
      const found = MOCK_ALBUMS.find(a => String(a.id) === String(id));
      if (!found) throw new Error('Album not found');
      return found;
    }
    return request<Album>(`/albums/${id}`);
  },
  search: async (q: string): Promise<{ tracks: Track[]; artists: Artist[]; albums: Album[]; playlists: Playlist[] }> => {
    if (_demoMode) {
      const query = q.toLowerCase();
      return {
        tracks: MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)),
        artists: MOCK_ARTISTS.filter(a => a.name.toLowerCase().includes(query)),
        albums: MOCK_ALBUMS.filter(a => a.title.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query)),
        playlists: MOCK_PLAYLISTS.filter(p => p.name.toLowerCase().includes(query)),
      };
    }
    return tryRequest<{ tracks: Track[]; artists: Artist[]; albums: Album[]; playlists: Playlist[] }>(`/search?q=${encodeURIComponent(q)}`);
  },
  library: {
    likes: async (): Promise<Track[]> => {
      if (_demoMode) return [];
      return request<Track[]>('/library/likes');
    },
    addLike: async (trackId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/likes', {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
      });
    },
    removeLike: async (trackId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/likes', {
        method: 'DELETE',
        body: JSON.stringify({ track_id: trackId }),
      });
    },
    follows: async (): Promise<Artist[]> => {
      if (_demoMode) return [];
      return request<Artist[]>('/library/follows');
    },
    addFollow: async (artistId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/follows', {
        method: 'POST',
        body: JSON.stringify({ artist_id: artistId }),
      });
    },
    removeFollow: async (artistId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/follows', {
        method: 'DELETE',
        body: JSON.stringify({ artist_id: artistId }),
      });
    },
    savedPlaylists: async (): Promise<Playlist[]> => {
      if (_demoMode) return [];
      return request<Playlist[]>('/library/saved-playlists');
    },
    savePlaylist: async (playlistId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/saved-playlists', {
        method: 'POST',
        body: JSON.stringify({ playlist_id: playlistId }),
      });
    },
    unsavePlaylist: async (playlistId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/saved-playlists', {
        method: 'DELETE',
        body: JSON.stringify({ playlist_id: playlistId }),
      });
    },
    recentlyPlayed: async (): Promise<Track[]> => {
      if (_demoMode) return [];
      return request<Track[]>('/library/recently-played');
    },
    addRecentlyPlayed: async (trackId: string): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/library/recently-played', {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
      });
    },
  },
  notifications: {
    get: async (): Promise<any[]> => {
      if (_demoMode) return [];
      return request<any[]>('/notifications');
    },
    markAllRead: async (): Promise<{ success: boolean }> => {
      if (_demoMode) return { success: true };
      return request<{ success: boolean }>('/notifications', { method: 'PATCH' });
    },
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
  avatar?: string | null;
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
  user?: number | null;
  is_public?: boolean;
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
  tickets_available: number;
  tickets_sold: number;
}
