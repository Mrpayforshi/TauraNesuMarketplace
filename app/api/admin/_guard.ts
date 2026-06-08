import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function requireAdmin(req: NextRequest): Promise
  | { adminId: string; error: null }
  | { adminId: null; error: NextResponse }
> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      adminId: null,
      error: NextResponse.json({ error: 'Missing authorization header' }, { status: 401 }),
    }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createAdminClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return {
      adminId: null,
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    }
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser) {
    return {
      adminId: null,
      error: NextResponse.json({ error: 'Forbidden — not an admin' }, { status: 403 }),
    }
  }

  return { adminId: adminUser.id, error: null }
}
