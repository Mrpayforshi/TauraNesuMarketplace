import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
 
  const make       = searchParams.get('make')
  const model      = searchParams.get('model')
  const body_type  = searchParams.get('body_type')
  const minprice   = searchParams.get('minprice')
  const maxprice   = searchParams.get('maxprice')
  const special    = searchParams.get('special')
  const sort       = searchParams.get('sort') || 'newest'
  const q          = searchParams.get('q')
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit      = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const offset     = (page - 1) * limit

  const supabase = createServerClient()

  let query = supabase
    .from('listings')
    .select(`
      id, slug, make, model, year, price_usd, mileage_km,
      body_type, transmission, fuel_type, colour,
      is_special, status, primary_image_url, published_at,
      dealers ( name, phone, city )
    `, { count: 'exact' })
    .eq('status', 'active')

  // Filters
  if (make)      query = query.ilike('make', make)
  if (model)     query = query.ilike('model', `%${model}%`)
  if (body_type) query = query.eq('body_type', body_type.toLowerCase())
  if (minprice)  query = query.gte('price_usd', parseFloat(minprice))
  if (maxprice)  query = query.lte('price_usd', parseFloat(maxprice))
  if (special === 'true') query = query.eq('is_special', true)

  // Keyword search across make, model
  if (q) {
    query = query.or(`make.ilike.%${q}%,model.ilike.%${q}%,description.ilike.%${q}%`)
  }

  // Sort
  switch (sort) {
    case 'price_asc':    query = query.order('price_usd', { ascending: true }); break
    case 'price_desc':   query = query.order('price_usd', { ascending: false }); break
    case 'mileage_asc':  query = query.order('mileage_km', { ascending: true }); break
    default:             query = query.order('published_at', { ascending: false })
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    listings: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    }
  })
}
