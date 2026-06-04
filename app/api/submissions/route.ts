import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ─── Validation helpers ────────────────────────────────────────────────────

const VALID_TRANSMISSIONS = ['automatic', 'manual'] as const
const VALID_FUEL_TYPES    = ['petrol', 'diesel'] as const
const VALID_CONDITIONS    = ['excellent', 'good', 'fair', 'poor'] as const
const VALID_INTENTS       = ['sell', 'trade_in', 'either'] as const
const CURRENT_YEAR        = new Date().getFullYear()

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

// ─── POST /api/submissions ─────────────────────────────────────────────────
// Public — no auth required.
// Accepts the full 4-step sell flow payload in a single JSON body.
// Returns { id } on success — frontend uses this to upload images next.

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON body')
  }

  // ── Step 1 fields: car details ──────────────────────────────────────────

  const make = typeof body.make === 'string' ? body.make.trim() : ''
  if (!make || make.length > 100) return err('make is required (max 100 chars)')

  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (!model || model.length > 100) return err('model is required (max 100 chars)')

  const year = Number(body.year)
  if (!Number.isInteger(year) || year < 1980 || year > CURRENT_YEAR + 1) {
    return err(`year must be an integer between 1980 and ${CURRENT_YEAR + 1}`)
  }

  const mileage_km = Number(body.mileage_km)
  if (!Number.isInteger(mileage_km) || mileage_km < 0 || mileage_km > 2_000_000) {
    return err('mileage_km must be a non-negative integer (max 2,000,000)')
  }

  const transmission = body.transmission as string
  if (!VALID_TRANSMISSIONS.includes(transmission as typeof VALID_TRANSMISSIONS[number])) {
    return err(`transmission must be one of: ${VALID_TRANSMISSIONS.join(', ')}`)
  }

  const fuel_type = body.fuel_type as string
  if (!VALID_FUEL_TYPES.includes(fuel_type as typeof VALID_FUEL_TYPES[number])) {
    return err(`fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}`)
  }

  const colour = typeof body.colour === 'string' ? body.colour.trim() : ''
  if (!colour || colour.length > 50) return err('colour is required (max 50 chars)')

  const condition = body.condition as string
  if (!VALID_CONDITIONS.includes(condition as typeof VALID_CONDITIONS[number])) {
    return err(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`)
  }

  const intent = body.intent as string
  if (!VALID_INTENTS.includes(intent as typeof VALID_INTENTS[number])) {
    return err(`intent must be one of: ${VALID_INTENTS.join(', ')}`)
  }

  // ── Optional Step 1 fields ───────────────────────────────────────────────

  const known_issues =
    typeof body.known_issues === 'string' ? body.known_issues.trim().slice(0, 1000) : null

  // ── Step 4 fields: seller contact ───────────────────────────────────────

  const seller_name = typeof body.seller_name === 'string' ? body.seller_name.trim() : ''
  if (!seller_name || seller_name.length > 100) {
    return err('seller_name is required (max 100 chars)')
  }

  const seller_phone = typeof body.seller_phone === 'string' ? body.seller_phone.trim() : ''
  if (!seller_phone || seller_phone.length < 7 || seller_phone.length > 20) {
    return err('seller_phone is required (7–20 characters)')
  }

  const seller_whatsapp =
    typeof body.seller_whatsapp === 'string' && body.seller_whatsapp.trim().length >= 7
      ? body.seller_whatsapp.trim()
      : seller_phone

  const seller_city = typeof body.seller_city === 'string' ? body.seller_city.trim() : ''
  if (!seller_city || seller_city.length > 100) {
    return err('seller_city is required (max 100 chars)')
  }

  const additional_notes =
    typeof body.additional_notes === 'string'
      ? body.additional_notes.trim().slice(0, 1000)
      : null

  // ── Insert into Supabase ─────────────────────────────────────────────────

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      make,
      model,
      year,
      mileage_km,
      transmission,
      fuel_type,
      colour,
      condition,
      intent,
      known_issues,
      seller_name,
      seller_phone,
      seller_whatsapp,
      seller_city,
      additional_notes,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/submissions] Supabase error:', error)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
