const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'https://moodspot-kz.onrender.com';
const TOKEN_KEY = 'moodstream_admin_token';
export function getAdminToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setAdminToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearAdminToken() {
    localStorage.removeItem(TOKEN_KEY);
}
function redirectToLogin() {
    clearAdminToken();
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}
export class ApiError extends Error {
    constructor(status, message, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'ApiError';
    }
}
export async function adminFetch(path, options = {}) {
    const token = getAdminToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const adminKey = import.meta.env['VITE_ADMIN_SECRET_KEY'];
    if (adminKey) {
        headers['X-Admin-Secret'] = adminKey;
    }
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
        ...options,
        headers,
    });
    if (response.status === 401) {
        redirectToLogin();
        throw new ApiError(401, 'Unauthorized');
    }
    if (!response.ok) {
        let body;
        try {
            body = await response.json();
        }
        catch {
            body = null;
        }
        const message = typeof body === 'object' &&
            body !== null &&
            'message' in body &&
            typeof body['message'] === 'string'
            ? body['message']
            : `HTTP ${response.status}`;
        throw new ApiError(response.status, message, body);
    }
    if (response.status === 204) {
        return undefined;
    }
    return response.json();
}
