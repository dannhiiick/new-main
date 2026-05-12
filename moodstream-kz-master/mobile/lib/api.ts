import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const SECURE_KEY_ACCESS = 'moodstream_access_token';
const SECURE_KEY_REFRESH = 'moodstream_refresh_token';

// We import clearAuth lazily to avoid circular deps
let _clearAuth: (() => void) | null = null;

export function registerClearAuth(fn: () => void): void {
  _clearAuth = fn;
}

async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEY_ACCESS);
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEY_REFRESH);
  } catch {
    return null;
  }
}

async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY_ACCESS, accessToken);
  await SecureStore.setItemAsync(SECURE_KEY_REFRESH, refreshToken);
}

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  // Retry up to 2 times — handles Render cold start (server waking up)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      await setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network request failed';
    throw new NetworkError(message);
  }

  if (res.status === 401 && retry) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    } else {
      _clearAuth?.();
      throw new ApiError(401, 'Unauthorized');
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export async function apiGet<T>(
  path: string,
  query?: Record<string, string>,
): Promise<T> {
  const url = query
    ? `${path}?${new URLSearchParams(query).toString()}`
    : path;
  return apiFetch<T>(url, { method: 'GET' });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}

export const API_URL = API_BASE;
