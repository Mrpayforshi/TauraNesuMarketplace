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
 * This reads the Authorization header straight off the incoming request
 * (via next/headers — works in any Route Handler without the request object
 * being passed in) and forwards that same token to PostgREST, so RLS
 * policies evaluate auth.uid() correctly for the calling user.
 *
 * If there's no Bearer token on the request (e.g. mid-login, before a token
 * exists yet), this behaves like a plain anon client — auth calls like
 * signInWithPassword() / signUp() still work and keep their session in
 * memory for the rest of that request, exactly as before.
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
export function createServerSupabaseClient() {
  const headerList = headers();
  const authHeader = headerList.get('authorization') ?? headerList.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
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
