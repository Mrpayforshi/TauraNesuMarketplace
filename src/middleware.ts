// Repo path: src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from './lib/supabase';
import { getAuthUser } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NOTE: This middleware only protects API routes (/api/admin/*, /api/dealer/*).
  // It intentionally does NOT gate the page routes (/admin/*, /dealer/*) anymore.
  // A page navigation (clicking a link, router.push, typing a URL) is a plain
  // browser GET request — it can never carry a custom Authorization header,
  // since the access token lives in localStorage and is only attached by
  // authFetch() on actual fetch() calls. Gating page routes the same way as
  // API routes meant every page load was treated as unauthenticated and
  // bounced straight back to /login, even right after a successful sign-in.
  //
  // Protected pages already guard themselves client-side: each one calls
  // authFetch() against its data endpoint on mount and redirects to /login
  // if it gets a 401 (see e.g. src/app/admin/dealers/page.tsx,
  // src/app/dealer/dashboard/page.tsx). The API routes below remain the
  // real enforcement point.
  //
  // IMPORTANT — never call createServerSupabaseClient() from this file.
  // That function (src/lib/supabase.ts) reads the incoming Authorization
  // header via next/headers' headers(), which only works inside a Server
  // Component / Route Handler request scope. Middleware runs in the Edge
  // Runtime *before* that scope exists, so calling it here throws
  // "Error: `headers` was called outside a request scope" on every request
  // that has a Bearer token — i.e. every real dealer request. This was the
  // root cause of the dealer API returning hard failures even for a
  // correctly authenticated dealer. Use getAuthUser(request) instead — it
  // takes the NextRequest/Request directly and never touches next/headers,
  // so it's safe in both middleware and route handlers.

  // ── ADMIN API ROUTES ────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin/')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user || data.user.app_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── DEALER API ROUTES ───────────────────────────────────────────────────────
  if (pathname.startsWith('/api/dealer/')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // getAuthUser reads request.headers directly — no next/headers,
      // safe to call from middleware. See note above.
      const user = await getAuthUser(request);

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
