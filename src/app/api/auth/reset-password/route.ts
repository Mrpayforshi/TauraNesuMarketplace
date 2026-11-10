// Repo path: src/app/api/auth/reset-password/route.ts  (NEW FILE)

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

// A reset link produces a brand-new access token the moment it is clicked.
// Requiring the token to be recent means a stolen OLD token can't be used to
// change someone's password through this endpoint.
const MAX_TOKEN_AGE_SEC = 30 * 60

function tokenIssuedAt(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const iat = JSON.parse(json).iat
    return typeof iat === 'number' ? iat : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(getClientIp(req), {
    prefix: 'reset:ip',
    limit: 10,
    windowSec: 3600,
  })
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { password } = body as Record<string, unknown>
  if (!password || typeof password !== 'string' || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const user = token ? await getAuthUser(req) : null

  const iat = token ? tokenIssuedAt(token) : null
  const fresh = iat !== null && Date.now() / 1000 - iat <= MAX_TOKEN_AGE_SEC

  if (!user || !fresh) {
    return Response.json(
      { error: 'This reset link has expired. Please request a new one.' },
      { status: 401 }
    )
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, { password })
  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ message: 'Password updated. You can now sign in.' })
}
