import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, slug, make, model, year, price_usd, mileage_km,
      body_type, transmission, fuel_type, is_special,
      primary_image_url, published_at,
      dealers ( name )
    `)
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .limit(8)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ listings: data })
}
