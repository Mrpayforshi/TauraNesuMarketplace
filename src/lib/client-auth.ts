// Client-side helper for attaching the Supabase access token to admin/dealer
// API requests. The backend (getAdminFromRequest / getDealerFromRequest /
// getAuthUser) requires an `Authorization: Bearer <token>` header on every
// protected request — this file is the missing piece that stores the token
// after login and attaches it automatically going forward.

const TOKEN_KEY = 'tn_access_token';
const EXPIRES_KEY = 'tn_token_expires_at';

interface SessionLike {
  access_token: string;
  expires_at?: number;
}

/**
 * Call this right after a successful POST /api/auth/login response, passing
 * the `session` object the route returns: { access_token, expires_at }.
 */
export function setAccessToken(session: SessionLike) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, session.access_token);
  if (session.expires_at) {
    localStorage.setItem(EXPIRES_KEY, String(session.expires_at));
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

/**
 * Drop-in replacement for fetch() that attaches the stored access token as
 * an Authorization header. Use this instead of fetch() for any
 * /api/admin/* or /api/dealer/* call made from a client component.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
