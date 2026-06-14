import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
 * USE THIS FOR:
 * - API routes that require user authentication
 * - Validating user sessions via Bearer token
 * - Dealer-scoped queries with RLS enforcement
 * - Any authenticated data operations
 *
 * DO NOT USE THIS FOR:
 * - Admin operations or storage uploads (use createAdminClient instead)
 * - Public routes without authentication (use createServerClient instead)
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Handle errors silently
        }
      },
    },
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
