import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getAuthUser, unauthorizedResponse } from '@/lib/auth'

const UNAVAILABLE_STATUSES = ['sold', 'archived', 'deleted']

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorizedResponse()

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('favourites')
    .select(`
      id,
      created_at,
      listing:listings (
        id,
        slug,
        make,
        model,
        year,
        price_usd,
        mileage_km,
        body_type,
        transmission,
        fuel_type,
        condition,
        primary_image_url,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/buyer/favourites]', error)
    return Response.json({ error: 'Failed to fetch favourites' }, { status: 500 })
  }

  const favourites = (data ?? []).map((row: any) => {
    const listing = row.listing
    const unavailable =
      !listing || UNAVAILABLE_STATUSES.includes(listing.status)

    return {
      favourite_id: row.id,
      saved_at: row.created_at,
      unavailable,
      listing: unavailable
        ? null
        : {
            id: listing.id,
            slug: listing.slug,
            make: listing.make,
            model: listing.model,
            year: listing.year,
            price_usd: listing.price_usd,
            mileage_km: listing.mileage_km,
            body_type: listing.body_type,
            transmission: listing.transmission,
            fuel_type: listing.fuel_type,
            condition: listing.condition,
            primary_image_url: listing.primary_image_url,
          },
    }
  })

  return Response.json({ favourites, count: favourites.length })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorizedResponse()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { listing_id } = body as Record<string, unknown>

  if (!listing_id || typeof listing_id !== 'string') {
    return Response.json({ error: 'listing_id is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, status')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (UNAVAILABLE_STATUSES.includes(listing.status)) {
    return Response.json({ error: 'This listing is no longer available' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('favourites')
    .upsert(
      { user_id: user.id, listing_id },
      { onConflict: 'user_id,listing_id', ignoreDuplicates: true }
    )
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[POST /api/buyer/favourites]', error)
    return Response.json({ error: 'Failed to save favourite' }, { status: 500 })
  }

  return Response.json(
    { message: 'Listing saved to favourites', favourite_id: data?.id },
    { status: 201 }
  )
}
