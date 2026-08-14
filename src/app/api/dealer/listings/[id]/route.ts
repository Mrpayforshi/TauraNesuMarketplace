import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// Allowed enum values
const ALLOWED_BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'minivan', 'truck', 'bus'];
const ALLOWED_TRANSMISSIONS = ['automatic', 'manual'];
const ALLOWED_FUEL_TYPES = ['petrol', 'diesel'];
const ALLOWED_CONDITIONS = ['excellent', 'good', 'fair'];
const ALLOWED_DRIVES = ['rhd', 'lhd'];

// Non-editable fields
const NON_EDITABLE_FIELDS = ['dealer_id', 'status', 'slug', 'created_at', 'published_at'];

// Helper: Validate field types and values for PATCH
function validateFieldTypes(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const currentYear = new Date().getFullYear();

  // Validate year if provided
  if ('year' in body) {
    if (typeof body.year !== 'number' || !Number.isInteger(body.year)) {
      return { valid: false, error: 'year must be an integer' };
    }
    if (body.year < 1990 || body.year > currentYear) {
      return { valid: false, error: `year must be between 1990 and ${currentYear}` };
    }
  }

  // Validate mileage_km if provided
  if ('mileage_km' in body) {
    if (typeof body.mileage_km !== 'number' || !Number.isInteger(body.mileage_km)) {
      return { valid: false, error: 'mileage_km must be an integer' };
    }
    if (body.mileage_km < 0) {
      return { valid: false, error: 'mileage_km must be non-negative' };
    }
  }

  // Validate price_usd if provided
  if ('price_usd' in body) {
    if (typeof body.price_usd !== 'number') {
      return { valid: false, error: 'price_usd must be a number' };
    }
    if (body.price_usd <= 0) {
      return { valid: false, error: 'price_usd must be positive' };
    }
  }

  // Validate make if provided
  if ('make' in body) {
    if (typeof body.make !== 'string' || body.make.trim() === '') {
      return { valid: false, error: 'make must be a non-empty string' };
    }
  }

  // Validate model if provided
  if ('model' in body) {
    if (typeof body.model !== 'string' || body.model.trim() === '') {
      return { valid: false, error: 'model must be a non-empty string' };
    }
  }

  // Validate colour if provided
  if ('colour' in body) {
    if (typeof body.colour !== 'string' || body.colour.trim() === '') {
      return { valid: false, error: 'colour must be a non-empty string' };
    }
  }

  // Validate description if provided
  if ('description' in body && body.description !== null && body.description !== undefined) {
    if (typeof body.description !== 'string') {
      return { valid: false, error: 'description must be a string' };
    }
  }

  // Validate vin if provided
  if ('vin' in body && body.vin !== null && body.vin !== undefined) {
    if (typeof body.vin !== 'string') {
      return { valid: false, error: 'vin must be a string' };
    }
  }

  // Validate is_special if provided
  if ('is_special' in body && body.is_special !== null && body.is_special !== undefined) {
    if (typeof body.is_special !== 'boolean') {
      return { valid: false, error: 'is_special must be a boolean' };
    }
  }

  // Validate body_type if provided
  if ('body_type' in body) {
    if (!ALLOWED_BODY_TYPES.includes(body.body_type as string)) {
      return { valid: false, error: `body_type must be one of: ${ALLOWED_BODY_TYPES.join(', ')}` };
    }
  }

  // Validate transmission if provided
  if ('transmission' in body) {
    if (!ALLOWED_TRANSMISSIONS.includes(body.transmission as string)) {
      return { valid: false, error: `transmission must be one of: ${ALLOWED_TRANSMISSIONS.join(', ')}` };
    }
  }

  // Validate fuel_type if provided
  if ('fuel_type' in body) {
    if (!ALLOWED_FUEL_TYPES.includes(body.fuel_type as string)) {
      return { valid: false, error: `fuel_type must be one of: ${ALLOWED_FUEL_TYPES.join(', ')}` };
    }
  }

  // Validate condition if provided
  if ('condition' in body) {
    if (!ALLOWED_CONDITIONS.includes(body.condition as string)) {
      return { valid: false, error: `condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}` };
    }
  }

  // Validate drive if provided
  if ('drive' in body) {
    if (!ALLOWED_DRIVES.includes(body.drive as string)) {
      return { valid: false, error: `drive must be one of: ${ALLOWED_DRIVES.join(', ')}` };
    }
  }

  // ── Trade-in fields (all optional) ──
  if ('trade_in_available' in body && body.trade_in_available !== null && body.trade_in_available !== undefined) {
    if (typeof body.trade_in_available !== 'boolean') {
      return { valid: false, error: 'trade_in_available must be a boolean' };
    }
  }
  if ('trade_in_notes' in body && body.trade_in_notes !== null && body.trade_in_notes !== undefined) {
    if (typeof body.trade_in_notes !== 'string') {
      return { valid: false, error: 'trade_in_notes must be a string' };
    }
  }
  if ('trade_in_min_year' in body && body.trade_in_min_year !== null && body.trade_in_min_year !== undefined) {
    if (typeof body.trade_in_min_year !== 'number' || !Number.isInteger(body.trade_in_min_year)) {
      return { valid: false, error: 'trade_in_min_year must be an integer' };
    }
    if (body.trade_in_min_year < 1990 || body.trade_in_min_year > currentYear) {
      return { valid: false, error: `trade_in_min_year must be between 1990 and ${currentYear}` };
    }
  }
  if ('trade_in_max_mileage_km' in body && body.trade_in_max_mileage_km !== null && body.trade_in_max_mileage_km !== undefined) {
    if (typeof body.trade_in_max_mileage_km !== 'number' || !Number.isInteger(body.trade_in_max_mileage_km)) {
      return { valid: false, error: 'trade_in_max_mileage_km must be an integer' };
    }
    if (body.trade_in_max_mileage_km < 0) {
      return { valid: false, error: 'trade_in_max_mileage_km must be non-negative' };
    }
  }
  if ('trade_in_accepted_body_types' in body && body.trade_in_accepted_body_types !== null && body.trade_in_accepted_body_types !== undefined) {
    if (!Array.isArray(body.trade_in_accepted_body_types)) {
      return { valid: false, error: 'trade_in_accepted_body_types must be an array' };
    }
    const invalid = (body.trade_in_accepted_body_types as unknown[]).filter(
      (v) => typeof v !== 'string' || !ALLOWED_BODY_TYPES.includes(v)
    );
    if (invalid.length > 0) {
      return { valid: false, error: `trade_in_accepted_body_types must only contain: ${ALLOWED_BODY_TYPES.join(', ')}` };
    }
  }

  return { valid: true };
}

// GET handler: Fetch a single listing owned by this dealer, with images
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const supabase = createServerSupabaseClient();

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_images (
          id,
          image_url,
          display_order
        )
        `
      )
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ listing }, { status: 200 });
  } catch (err) {
    console.error('GET /dealer/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH handler: Update a listing
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const supabase = createServerSupabaseClient();

    // Fetch the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const body = await request.json();

    // Strip non-editable fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!NON_EDITABLE_FIELDS.includes(key)) {
        updateData[key] = value;
      }
    }

    // Validate field types
    const typeValidation = validateFieldTypes(updateData);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    // NOTE: slug is intentionally never regenerated here. Slugs are set once at
    // creation and kept permanent for the life of the listing, so that links,
    // bookmarks, and shared URLs never break as a result of a dealer edit —
    // including edits to make/model/year. 'slug' is already stripped above via
    // NON_EDITABLE_FIELDS.

    // Trim string fields
    if ('make' in updateData && typeof updateData.make === 'string') {
      updateData.make = updateData.make.trim();
    }
    if ('model' in updateData && typeof updateData.model === 'string') {
      updateData.model = updateData.model.trim();
    }
    if ('colour' in updateData && typeof updateData.colour === 'string') {
      updateData.colour = updateData.colour.trim();
    }
    if ('description' in updateData && updateData.description !== null && typeof updateData.description === 'string') {
      updateData.description = updateData.description.trim();
    }
    if ('vin' in updateData && updateData.vin !== null && typeof updateData.vin === 'string') {
      updateData.vin = updateData.vin.trim();
    }

    // Update the listing
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (err) {
    console.error('PATCH /dealer/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// DELETE handler: Soft-delete a listing (dealer-owned)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const supabase = createServerSupabaseClient();

    // Fetch the listing to confirm it exists and belongs to this dealer
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status === 'deleted') {
      return NextResponse.json({ error: 'Listing is already deleted' }, { status: 400 });
    }

    // Soft delete: flip status rather than removing the row.
    // RLS only grants dealers UPDATE on their own listings (no DELETE policy),
    // and 'deleted' is already an allowed value in listings_status_check.
    const { data: deletedListing, error: updateError } = await supabase
      .from('listings')
      .update({ status: 'deleted' })
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(deletedListing, { status: 200 });
  } catch (err) {
    console.error('DELETE /dealer/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
