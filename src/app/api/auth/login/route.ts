
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

  // Determine the user's role so the client knows where to redirect.
  // - admin: app_metadata.role === 'admin' (set server-side, can't be spoofed)
  // - dealer: an active row in `dealers` linked to this auth user
  // - buyer: everyone else
  let role: 'admin' | 'dealer' | 'buyer' = 'buyer'

  if (data.user.app_metadata?.role === 'admin') {
    role = 'admin'
  } else {
    // `supabase` already holds the just-created session for this request,
    // so this query runs as the authenticated user (RLS-aware), same as
    // getDealerFromRequest() in src/lib/dealer-auth.ts.
    const { data: dealer } = await supabase
      .from('dealers')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .eq('status', 'active')
      .single()

    if (dealer) {
      role = 'dealer'
    }
  }

  return Response.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    role,
    session: {
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
    },
  })
}
