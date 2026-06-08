import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '../../_guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const body = await req.json()
  const { status, subscription_tier, listing_limit, notes } = body

  const validStatuses = ['pending', 'active', 'suspended']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const validTiers = ['basic', 'standard', 'premium']
  if (subscription_tier && !validTiers.includes(subscription_tier)) {
    return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (subscription_tier !== undefined) updates.subscription_tier = subscription_tier
  if (listing_limit !== undefined) updates.listing_limit = listing_limit
  if (notes !== undefined) updates.notes = notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('dealers')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })

  return NextResponse.json({ dealer: data })
}
