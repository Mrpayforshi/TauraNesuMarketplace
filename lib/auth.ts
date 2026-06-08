import { createServerClient } from './supabase';
import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string
}

/**
 * Extracts the authenticated user from the request.
 * Reads the Authorization: Bearer <token> header and validates with Supabase Auth.
 * Returns null if unauthenticated or token is invalid.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice(7)
  const supabase = createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  return { id: user.id, email: user.email! }
}

/**
 * Returns a 401 JSON response.
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}
