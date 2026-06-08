import { NextRequest, NextResponse } from 'next/server';


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session on every request
  

  // Check if this is a protected dealer route
  const isDealerApiRoute = pathname.startsWith('/api/dealer/');
  const isDealerPageRoute = pathname.startsWith('/dealer/');

  if (isDealerApiRoute || isDealerPageRoute) {
    // Validate Bearer token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // API route: return 401 JSON
      if (isDealerApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Page route: redirect to login
      if (isDealerPageRoute) {
        return NextResponse.redirect(
          new URL('/login?type=dealer', request.url)
        );
      }
    }

    // Extract token and validate
    const token = authHeader.slice(7);
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        // API route: return 401 JSON
        if (isDealerApiRoute) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        // Page route: redirect to login
        if (isDealerPageRoute) {
          return NextResponse.redirect(
            new URL('/login?type=dealer', request.url)
          );
        }
      }
    } catch (error) {
      // API route: return 401 JSON
      if (isDealerApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Page route: redirect to login
      if (isDealerPageRoute) {
        return NextResponse.redirect(
          new URL('/login?type=dealer', request.url)
        );
      }
    }
  }

  // All other routes pass through untouched
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
