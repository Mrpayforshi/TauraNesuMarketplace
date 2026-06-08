import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '../_guard'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('listings')
    .select(`
      id, slug, make, model, year, price_usd, status,
      is_special, primary_image_url, created_at, published_at,
      dealers ( id, name, city )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    listings: data,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
}
