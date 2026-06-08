import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '../../../../_guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const body = await req.json()
  const { status } = body

  const validStatuses = ['active', 'draft', 'deleted']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const updates: Record<string, unknown> = { status }
  if (status === 'active') updates.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  return NextResponse.json({ listing: data })
}
