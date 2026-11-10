import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { normalizeZimPhone, phoneToSyntheticEmail } from '@/lib/phone-auth'
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password } = body as Record<string, unknown>

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!password || typeof password !== 'string') {
    return Response.json({ error: 'Password is required' }, { status: 400 })
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Two buckets: one per IP (stops one machine spraying many accounts) and one
  // per identifier (stops many machines hammering one account).
  const ip = getClientIp(req)
  const identifier = email.trim().toLowerCase().slice(0, 200)

  const ipLimit = await checkRateLimit(ip, { prefix: 'login:ip', limit: 20, windowSec: 600 })
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec)

  const idLimit = await checkRateLimit(identifier, { prefix: 'login:id', limit: 8, windowSec: 900 })
  if (!idLimit.ok) return tooManyRequests(idLimit.retryAfterSec)

  // The login form's single input accepts either an email or a dealer's
  // login phone number — figure out which was typed. Anything containing
  // "@" is treated as an email as before (buyers always use this path).
  // Anything else is checked against normalizeZimPhone; if it resolves,
  // we look up the synthetic email Supabase Auth actually has on file for
  // that phone (see lib/phone-auth.ts) and sign in with that instead.
  // This lookup needs the service-role client since it has to find the
  // dealer by login_phone before any session/RLS context exists yet.
  let resolvedEmail = email.trim().toLowerCase()

  if (!resolvedEmail.includes('@')) {
    const normalizedPhone = normalizeZimPhone(email)
    if (!normalizedPhone) {
      // Doesn't look like an email and doesn't parse as a Zimbabwean
      // phone either — fail the same generic way as a bad password,
      // rather than revealing which check failed.
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: dealerByPhone } = await adminClient
      .from('dealers')
      .select('auth_user_id')
      .eq('login_phone', normalizedPhone)
      .maybeSingle()

    if (!dealerByPhone?.auth_user_id) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    resolvedEmail = phoneToSyntheticEmail(normalizedPhone)
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  })

  if (error || !data.session) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // Determine the account's capabilities so the client knows where to send
  // the user.
  //
  // admin and dealer are NOT mutually exclusive — the same auth user can
  // carry app_metadata.role === 'admin' AND own an active row in `dealers`
  // at the same time (this actually happens in this project right now).
  // Always resolve both flags; let the caller decide what to do with them
  // based on the user's actual intent (see the `portal` handling in
  // src/app/login/page.tsx).

  const isAdmin = data.user.app_metadata?.role === 'admin'

  // `supabase` already holds the just-created session for this request,
  // so this query runs as the authenticated user (RLS-aware), same as
  // getDealerFromRequest() in src/lib/dealer-auth.ts.
  const { data: dealer } = await supabase
    .from('dealers')
    .select('id')
    .eq('auth_user_id', data.user.id)
    .eq('status', 'active')
    .single()

  const isDealer = !!dealer

  // Kept for backward compatibility with any caller that only reads a
  // single `role` string — used by the generic "Sign in" flow (no
  // explicit portal intent), where admin > dealer > buyer is a reasonable
  // default.
  let role: 'admin' | 'dealer' | 'buyer' = 'buyer'
  if (isAdmin) role = 'admin'
  else if (isDealer) role = 'dealer'

  return Response.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    role,
    isAdmin,
    isDealer,
    dealerId: dealer?.id ?? null,
    session: {
      access_token: data.session.access_token,
      // Needed so the client can silently renew the ~1 hour access token
      // via /api/auth/refresh instead of kicking the user back to /login.
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  })
}
