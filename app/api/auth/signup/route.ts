import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    await supabase
      .from('users')
      .update(updates)
      .eq('id', data.user.id)
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