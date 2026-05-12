const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'https://moodspot-kz.onrender.com'
const TOKEN_KEY = 'moodstream_admin_token'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function redirectToLogin(): void {
  clearAdminToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const adminKey = import.meta.env['VITE_ADMIN_SECRET_KEY']
  if (adminKey) {
    headers['X-Admin-Secret'] = adminKey
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    redirectToLogin()
    throw new ApiError(401, 'Unauthorized')
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    const message: string =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as Record<string, unknown>)['message'] === 'string'
        ? ((body as Record<string, unknown>)['message'] as string)
        : `HTTP ${response.status}`
    throw new ApiError(response.status, message, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
