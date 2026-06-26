import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/listings
 * List all listings across all dealers. Supports ?status= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = createAdminClient();
    let query = supabase
      .from('listings')
      .select(`
        id, make, model, year, price_usd, status, created_at,
        dealers ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
    }

    return NextResponse.json({ listings: data ?? [] });
  } catch (error) {
    console.error('Admin listings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ALLOWED_BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'minivan'];
const ALLOWED_TRANSMISSIONS = ['automatic', 'manual'];
const ALLOWED_FUEL_TYPES = ['petrol', 'diesel'];
const ALLOWED_CONDITIONS = ['excellent', 'good', 'fair'];
const ALLOWED_DRIVES = ['rhd', 'lhd'];
const ALLOWED_STATUSES = ['draft', 'pending_review', 'active'];

// Generate slug with random suffix (same approach used by the dealer routes)
function generateSlug(make: string, model: string, year: number, city: string): string {
  const base = `${make}-${model}-${year}-${city}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/**
 * POST /api/admin/listings
 * Admin creates a listing directly, on behalf of an existing dealer.
 * Unlike the dealer-facing creation flow, admin can publish straight to
 * 'active' since the admin-curated launch model treats admin as the
 * reviewer — there's no separate approval step for admin's own listings.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      dealer_id,
      make,
      model,
      year,
      price_usd,
      mileage_km,
      body_type,
      transmission,
      fuel_type,
      colour,
      condition,
      drive,
      description,
      vin,
      is_special,
      primary_image_url,
      status,
    } = body;

    // dealer_id is required — admin-created listings must belong to a dealer
    if (!dealer_id || typeof dealer_id !== 'string') {
      return NextResponse.json(
        { error: 'dealer_id is required' },
        { status: 400 }
      );
    }

    // Required vehicle fields
    if (!make || typeof make !== 'string' || !make.trim()) {
      return NextResponse.json({ error: 'make is required' }, { status: 400 });
    }
    if (!model || typeof model !== 'string' || !model.trim()) {
      return NextResponse.json({ error: 'model is required' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1990 || year > currentYear) {
      return NextResponse.json(
        { error: `year must be an integer between 1990 and ${currentYear}` },
        { status: 400 }
      );
    }

    if (typeof price_usd !== 'number' || price_usd <= 0) {
      return NextResponse.json({ error: 'price_usd must be a positive number' }, { status: 400 });
    }

    // Optional enum fields
    if (body_type !== undefined && !ALLOWED_BODY_TYPES.includes(body_type)) {
      return NextResponse.json(
        { error: `body_type must be one of: ${ALLOWED_BODY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (transmission !== undefined && !ALLOWED_TRANSMISSIONS.includes(transmission)) {
      return NextResponse.json(
        { error: `transmission must be one of: ${ALLOWED_TRANSMISSIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (fuel_type !== undefined && !ALLOWED_FUEL_TYPES.includes(fuel_type)) {
      return NextResponse.json(
        { error: `fuel_type must be one of: ${ALLOWED_FUEL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (condition !== undefined && !ALLOWED_CONDITIONS.includes(condition)) {
      return NextResponse.json(
        { error: `condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (drive !== undefined && !ALLOWED_DRIVES.includes(drive)) {
      return NextResponse.json(
        { error: `drive must be one of: ${ALLOWED_DRIVES.join(', ')}` },
        { status: 400 }
      );
    }

    // Status defaults to 'active' for admin-originated listings, but admin
    // may explicitly choose draft / pending_review instead.
    const resolvedStatus = status !== undefined ? status : 'active';
    if (!ALLOWED_STATUSES.includes(resolvedStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Confirm the dealer actually exists before attaching the listing to it
    const { data: dealer, error: dealerError } = await supabase
      .from('dealers')
      .select('id, city')
      .eq('id', dealer_id)
      .single();

    if (dealerError || !dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const slug = generateSlug(make.trim(), model.trim(), year, dealer.city ?? '');

    const insertPayload = {
      dealer_id,
      make: make.trim(),
      model: model.trim(),
      year,
      price_usd,
      mileage_km: mileage_km ?? null,
      body_type: body_type ?? null,
      transmission: transmission ?? null,
      fuel_type: fuel_type ?? null,
      colour: colour?.trim() || null,
      description: description?.trim() || null,
      is_special: is_special ?? false,
      status: resolvedStatus,
      primary_image_url: primary_image_url || null,
      slug,
      condition: condition ?? null,
      drive: drive ?? null,
      vin: vin?.trim() || null,
      published_at: resolvedStatus === 'active' ? new Date().toISOString() : null,
    };

    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Admin listings POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
