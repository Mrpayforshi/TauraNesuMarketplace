import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)

  // Already signed out / expired token: nothing to revoke. Treat as success
  // so the client can always clear its local token and move on.
  if (!user) {
    return Response.json({ message: 'Logged out successfully' })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  // The old version called signOut() on a client that held no session in
  // memory, which did nothing — the token stayed valid until it expired.
  // admin.signOut(jwt) actually revokes this session on Supabase's side.
  // scope 'local' ends only this device's session, not the user's others.
  if (token) {
    try {
      await createAdminClient().auth.admin.signOut(token, 'local')
    } catch (err) {
      console.error('logout: failed to revoke session', err)
    }
  }

  return Response.json({ message: 'Logged out successfully' })
}
