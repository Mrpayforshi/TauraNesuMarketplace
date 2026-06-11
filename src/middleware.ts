import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from './lib/supabase';
import { createAdminClient } from './lib/supabase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── ADMIN ROUTES ──────────────────────────────────────────────────────────
  const isAdminApiRoute = pathname.startsWith('/api/admin/');
  const isAdminPageRoute = pathname.startsWith('/admin/');

  if (isAdminApiRoute || isAdminPageRoute) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?type=admin', request.url));
    }

    const token = authHeader.slice(7);
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user || data.user.app_metadata?.role !== 'admin') {
        if (isAdminApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login?type=admin', request.url));
      }
    } catch {
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?type=admin', request.url));
    }
  }

  // ── DEALER ROUTES ─────────────────────────────────────────────────────────
  const isDealerApiRoute = pathname.startsWith('/api/dealer/');
  const isDealerPageRoute = pathname.startsWith('/dealer/');

  if (isDealerApiRoute || isDealerPageRoute) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isDealerApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?type=dealer', request.url));
    }

    const token = authHeader.slice(7);
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        if (isDealerApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(
          new URL('/login?type=dealer', request.url)
        );
      }
    } catch {
      if (isDealerApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?type=dealer', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
