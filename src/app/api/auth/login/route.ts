import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
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
  // The previous version of this route checked admin first and returned
  // immediately if it matched, never even querying `dealers` for that
  // user. That meant an admin account that also runs a dealer profile was
  // ALWAYS redirected to /admin and could never reach /dealer/dashboard
  // through this form, regardless of intent. Always resolve both flags;
  // let the caller decide what to do with them based on the user's actual
  // intent (see the `portal` handling in src/app/login/page.tsx).

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
  // default. Callers that DO know the user's intent (e.g. they arrived via
  // the Dealer entry point) should branch on isDealer / isAdmin directly
  // instead of collapsing to this field.
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
      expires_at: data.session.expires_at,
    },
  })
}
