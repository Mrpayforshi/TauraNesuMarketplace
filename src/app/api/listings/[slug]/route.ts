import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id, slug, make, model, year, price_usd, mileage_km,
      body_type, transmission, fuel_type, colour, description,
      is_special, status, primary_image_url, condition, drive,
      published_at, created_at,
      dealers ( name, phone, city ),
      listing_images ( image_url, display_order )
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Sort images by display_order
  if (listing.listing_images) {
    listing.listing_images.sort(
      (a: { display_order: number }, b: { display_order: number }) =>
        a.display_order - b.display_order
    )
  }

  return NextResponse.json({ listing })
}
