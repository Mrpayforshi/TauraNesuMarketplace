import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client — uses service role key, NEVER expose to browser
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

// Server client using anon key (for public API routes)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
}

// Alias used by auth routes and buyer routes
export const createServerSupabaseClient = createServerClient