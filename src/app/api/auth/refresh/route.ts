// Repo path: src/app/api/auth/refresh/route.ts  (NEW FILE)

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { refresh_token } = body as Record<string, unknown>
  if (!refresh_token || typeof refresh_token !== 'string') {
    return Response.json({ error: 'refresh_token is required' }, { status: 400 })
  }

  const limit = await checkRateLimit(getClientIp(req), {
    prefix: 'refresh:ip',
    limit: 60,
    windowSec: 600,
  })
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec)

  // Plain anon client: the refresh token itself is the credential.
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.refreshSession({ refresh_token })

  if (error || !data.session) {
    return Response.json({ error: 'Session expired. Please sign in again.' }, { status: 401 })
  }

  return Response.json({
    session: {
      access_token: data.session.access_token,
      // Supabase rotates refresh tokens: the old one stops working, so the
      // client must store this new one.
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  })
}
