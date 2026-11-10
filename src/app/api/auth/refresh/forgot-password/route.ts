// Repo path: src/app/api/auth/forgot-password/route.ts  (NEW FILE)

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit'

// Where the emailed link sends the person. Must ALSO be listed under
// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs,
// or Supabase will ignore it and use the Site URL instead.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://taura-nesu-marketplace.vercel.app').replace(/\/$/, '')

const GENERIC_OK = {
  message: 'If an account exists for that email, a reset link is on its way.',
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email } = body as Record<string, unknown>
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase().slice(0, 200)

  const ipLimit = await checkRateLimit(getClientIp(req), {
    prefix: 'forgot:ip',
    limit: 5,
    windowSec: 3600,
  })
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec)

  const emailLimit = await checkRateLimit(cleanEmail, {
    prefix: 'forgot:email',
    limit: 3,
    windowSec: 3600,
  })
  if (!emailLimit.ok) return tooManyRequests(emailLimit.retryAfterSec)

  try {
    const supabase = createServerClient()
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${SITE_URL}/reset-password`,
    })
  } catch (err) {
    // Deliberately swallowed: telling the caller whether sending worked would
    // reveal whether the email has an account.
    console.error('forgot-password: send failed', err)
  }

  // Same response whether or not the email exists.
  return Response.json(GENERIC_OK)
}
