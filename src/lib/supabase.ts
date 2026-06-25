import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates a public Supabase client for unauthenticated routes.
 *
 * USE THIS FOR:
 * - Public routes that do not require authentication
 * - Queries that rely on RLS policies to restrict access
 * - Any non-sensitive data retrieval
 *
 * DO NOT USE THIS FOR:
 * - Authenticated routes (use createServerSupabaseClient instead)
 * - Admin operations or storage uploads (use createAdminClient instead)
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates an authenticated Supabase client for protected routes.
 *
 * This app has no Supabase auth cookie — every client request authenticates
 * via a Bearer token stored client-side in localStorage (see
 * src/lib/client-auth.ts) and attached by authFetch(). There is never a
 * session to restore from cookies, so a cookie-based client has no identity
 * attached and every RLS policy that checks auth.uid() silently blocks it.
 *
 * Pass the Bearer token explicitly via the `token` argument whenever you
 * have access to the raw `Request`/`NextRequest` object (e.g.
 * `request.headers.get('authorization')`). This is the reliable path.
 *
 * If `token` is omitted, this falls back to reading the Authorization
 * header via `next/headers`. That fallback exists for compatibility with
 * any caller that hasn't been updated yet, but it is NOT guaranteed to see
 * the same header data as the `request` parameter in every execution
 * context — prefer passing `token` explicitly wherever possible.
 *
 * If there's no Bearer token resolved at all (e.g. mid-login, before a
 * token exists yet), this behaves like a plain anon client — auth calls
 * like signInWithPassword() / signUp() still work and keep their session
 * in memory for the rest of that request, exactly as before.
 *
 * USE THIS FOR:
 * - API routes that require user authentication
 * - Validating user sessions via Bearer token
 * - Dealer-scoped or buyer-scoped queries with RLS enforcement
 * - Any authenticated data operations
 *
 * DO NOT USE THIS FOR:
 * - Admin operations or storage uploads (use createAdminClient instead)
 * - Public routes without authentication (use createServerClient instead)
 */
export function createServerSupabaseClient(token?: string) {
  let resolvedToken = token;

  if (!resolvedToken) {
    const headerList = headers();
    const authHeader = headerList.get('authorization') ?? headerList.get('Authorization');
    resolvedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(resolvedToken
      ? { global: { headers: { Authorization: `Bearer ${resolvedToken}` } } }
      : {}),
  });
}

/**
 * Creates an admin Supabase client with service role privileges.
 * This client BYPASSES RLS policies entirely.
 *
 * USE THIS FOR:
 * - Storage uploads and file operations
 * - Admin-only database operations
 * - Service-level actions that require unrestricted access
 *
 * DO NOT USE THIS FOR:
 * - Regular authenticated API routes (use createServerSupabaseClient instead)
 * - Public routes (use createServerClient instead)
 * - NEVER expose this client to the browser or client-side code
 */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
