import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getAuthUser, unauthorizedResponse } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorizedResponse()

  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  return Response.json({ message: 'Logged out successfully' })
}
