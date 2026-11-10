// Client-side helper for attaching the Supabase access token to admin/dealer
// API requests. The backend (getAdminFromRequest / getDealerFromRequest /
// getAuthUser) requires an `Authorization: Bearer <token>` header on every
// protected request — this file stores the token after login and attaches it
// automatically going forward.
//
// Supabase access tokens last about an hour. To avoid bouncing dealers to
// /login mid-session, we also keep the refresh token and renew the access
// token quietly (see refreshSession below) shortly before it expires, or once
// if a request comes back 401.

const TOKEN_KEY = 'tn_access_token';
const EXPIRES_KEY = 'tn_token_expires_at';
const REFRESH_KEY = 'tn_refresh_token';

// Renew this many seconds before the access token actually expires.
const REFRESH_MARGIN_SEC = 60;

interface SessionLike {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

/**
 * Call this right after a successful POST /api/auth/login (or signup)
 * response, passing the `session` object the route returns.
 */
export function setAccessToken(session: SessionLike) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    if (session.expires_at) {
      localStorage.setItem(EXPIRES_KEY, String(session.expires_at));
    }
    if (session.refresh_token) {
      localStorage.setItem(REFRESH_KEY, session.refresh_token);
    }
  } catch {
    // Storage blocked (private mode, full quota) — the user just won't stay
    // signed in; nothing else to do.
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function getExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EXPIRES_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

// If several requests notice the expiry at the same moment they must share ONE
// refresh call — Supabase rotates refresh tokens, so a second parallel call
// with the old token would fail and wrongly sign the user out.
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the stored refresh token for a new access token.
 * Resolves true on success. On failure it clears the stored tokens (the
 * session is genuinely over) and resolves false.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        // 401 = refresh token is dead. Anything else (429, 5xx) is
        // temporary, so keep the tokens and let the caller try again later.
        if (res.status === 401) clearAccessToken();
        return false;
      }
      const data = await res.json();
      if (!data.session?.access_token) return false;
      setAccessToken(data.session);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Drop-in replacement for fetch() that attaches the stored access token as
 * an Authorization header. Use this instead of fetch() for any
 * /api/admin/* or /api/dealer/* call made from a client component.
 *
 * It renews the token shortly before expiry, and retries a request once
 * with a fresh token if the server answers 401.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const expiresAt = getExpiresAt();
  if (
    expiresAt &&
    getRefreshToken() &&
    Date.now() / 1000 >= expiresAt - REFRESH_MARGIN_SEC
  ) {
    await refreshSession();
  }

  const send = () => {
    const token = getAccessToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  const res = await send();

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) return send();
  }

  return res;
}
