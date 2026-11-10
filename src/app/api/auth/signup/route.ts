import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password, full_name, phone } = body as Record<string, unknown>

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length === 0)) {
    return Response.json({ error: 'full_name must be a non-empty string' }, { status: 400 })
  }
  if (phone !== undefined && typeof phone !== 'string') {
    return Response.json({ error: 'phone must be a string' }, { status: 400 })
  }

  // 5 sign-ups per hour per IP is plenty for a real person (or a shared
  // office/NAT) and stops scripted account creation.
  const limit = await checkRateLimit(getClientIp(req), {
    prefix: 'signup:ip',
    limit: 5,
    windowSec: 3600,
  })
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec)

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 400 })
  }

  if (!data.user) {
    return Response.json({ error: 'Signup failed — please try again' }, { status: 500 })
  }

  if (full_name || phone) {
    const updates: Record<string, string> = {}
    if (full_name && typeof full_name === 'string') updates.full_name = full_name.trim()
    if (phone && typeof phone === 'string') updates.phone = phone.trim()

    // Uses the service-role client on purpose. When email confirmation is
    // switched on in Supabase, signUp() returns NO session, so a normal
    // (RLS-bound) client has no identity and this update was being blocked
    // silently — the person's name was lost with no error. The id comes from
    // the user we just created, never from request input, so this is safe.
    const admin = createAdminClient()
    const { error: profileError } = await admin
      .from('users')
      .update(updates)
      .eq('id', data.user.id)

    if (profileError) {
      console.error('signup: failed to save profile fields', profileError.message)
    }
  }

  return Response.json(
    {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
      message: data.session
        ? 'Account created successfully'
        : 'Account created — please check your email to confirm your address',
    },
    { status: 201 }
  )
}
