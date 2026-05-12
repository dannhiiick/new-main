import type { CurrentUser, UserSettings } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api';

export type ApiError = { detail?: string } & Record<string, unknown>;

function getStoredAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function setStoredAccessToken(token: string | null) {
  if (!token) localStorage.removeItem('access_token');
  else localStorage.setItem('access_token', token);
}

export type TokenPair = { access: string; refresh: string; user?: CurrentUser };

function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

function setStoredRefreshToken(token: string | null) {
  if (!token) localStorage.removeItem('refresh_token');
  else localStorage.setItem('refresh_token', token);
}

export function hasStoredAuthTokens() {
  return Boolean(getStoredAccessToken() || getStoredRefreshToken());
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getStoredRefreshToken();
  if (!refresh) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = (await res.json()) as { access: string };
  setStoredAccessToken(data.access);
  return data.access;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && options.headers !== null
      ? (options.headers as Record<string, string>)
      : {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // If access token expired, attempt refresh once.
    if (res.status === 401) {
      try {
        const newAccess = await refreshAccessToken();
        headers['Authorization'] = `Bearer ${newAccess}`;
        const retryRes = await fetch(
          `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`,
          {
            ...options,
            headers,
          }
        );

        if (!retryRes.ok) {
          let payload: ApiError | undefined;
          try {
            payload = await retryRes.json();
          } catch {
            payload = undefined;
          }
          const detail = payload?.detail || `Request failed with status ${retryRes.status}`;
          throw new Error(detail);
        }

        if (retryRes.status === 204) return undefined as T;
        return (await retryRes.json()) as T;
      } catch {
        // fallthrough and throw original
      }
    }

    let payload: ApiError | undefined;
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }
    const detail = payload?.detail || `Request failed with status ${res.status}`;
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}


export async function register(payload: {
  username: string;
  password: string;
  email?: string;
}) {
  const res = await apiRequest<TokenPair>(`auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredAccessToken(res.access);
  setStoredRefreshToken(res.refresh);
  return res.user ?? me();
}

export async function login(payload: { username: string; password: string }) {
  const res = await apiRequest<TokenPair>(`auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredAccessToken(res.access);
  setStoredRefreshToken(res.refresh);
  return res.user ?? me();
}


export async function me() {
  return apiRequest<CurrentUser>(`auth/me`, { method: 'GET' });
}

export async function updateMe(payload: {
  username: string;
  email?: string;
  display_name?: string;
  bio?: string;
  city?: string;
}) {
  return apiRequest<CurrentUser>(`auth/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchSettings() {
  return apiRequest<UserSettings>(`settings`, { method: 'GET' });
}

export async function updateSettings(payload: Partial<UserSettings>) {
  return apiRequest<UserSettings>(`settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  setStoredAccessToken(null);
  setStoredRefreshToken(null);
}
