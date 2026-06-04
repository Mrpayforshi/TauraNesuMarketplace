import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// Allowed enum values
const ALLOWED_BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'minivan'];
const ALLOWED_TRANSMISSIONS = ['automatic', 'manual'];
const ALLOWED_FUEL_TYPES = ['petrol', 'diesel'];
const ALLOWED_CONDITIONS = ['excellent', 'good', 'fair'];
const ALLOWED_DRIVES = ['rhd', 'lhd'];

// Helper: Generate slug with random suffix
function generateSlug(make: string, model: string, year: number, city: string): string {
  const base = `${make}-${model}-${year}-${city}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

// Helper: Validate required fields
function validateRequiredFields(body: Record<string, unknown>): { valid: boolean; missing?: string[] } {
  const required = ['make', 'model', 'year', 'price_usd', 'mileage_km', 'body_type', 'transmission', 'fuel_type', 'colour', 'condition', 'drive'];
  const missing: string[] = [];

  for (const field of required) {
    const value = body[field];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing: missing.length > 0 ? missing : undefined };
}

// Helper: Validate field types and values
function validateFieldTypes(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const currentYear = new Date().getFullYear();

  // Validate year
  if (typeof body.year !== 'number' || !Number.isInteger(body.year)) {
    return { valid: false, error: 'year must be an integer' };
  }
  if (body.year < 1990 || body.year > currentYear) {
    return { valid: false, error: `year must be between 1990 and ${currentYear}` };
  }

  // Validate mileage_km
  if (typeof body.mileage_km !== 'number' || !Number.isInteger(body.mileage_km)) {
    return { valid: false, error: 'mileage_km must be an integer' };
  }
  if (body.mileage_km < 0) {
    return { valid: false, error: 'mileage_km must be non-negative' };
  }

  // Validate price_usd
  if (typeof body.price_usd !== 'number') {
    return { valid: false, error: 'price_usd must be a number' };
  }
  if (body.price_usd <= 0) {
    return { valid: false, error: 'price_usd must be positive' };
  }

  // Validate string fields
  if (typeof body.make !== 'string' || body.make.trim() === '') {
    return { valid: false, error: 'make must be a non-empty string' };
  }
  if (typeof body.model !== 'string' || body.model.trim() === '') {
    return { valid: false, error: 'model must be a non-empty string' };
  }
  if (typeof body.colour !== 'string' || body.colour.trim() === '') {
    return { valid: false, error: 'colour must be a non-empty string' };
  }

  // Validate optional string fields
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }
  if (body.vin !== undefined && body.vin !== null && typeof body.vin !== 'string') {
    return { valid: false, error: 'vin must be a string' };
  }

  // Validate optional boolean field
  if (body.is_special !== undefined && body.is_special !== null && typeof body.is_special !== 'boolean') {
    return { valid: false, error: 'is_special must be a boolean' };
  }

  // Validate enum fields
  if (!ALLOWED_BODY_TYPES.includes(body.body_type as string)) {
    return { valid: false, error: `body_type must be one of: ${ALLOWED_BODY_TYPES.join(', ')}` };
  }
  if (!ALLOWED_TRANSMISSIONS.includes(body.transmission as string)) {
    return { valid: false, error: `transmission must be one of: ${ALLOWED_TRANSMISSIONS.join(', ')}` };
  }
  if (!ALLOWED_FUEL_TYPES.includes(body.fuel_type as string)) {
    return { valid: false, error: `fuel_type must be one of: ${ALLOWED_FUEL_TYPES.join(', ')}` };
  }
  if (!ALLOWED_CONDITIONS.includes(body.condition as string)) {
    return { valid: false, error: `condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}` };
  }
  if (!ALLOWED_DRIVES.includes(body.drive as string)) {
    return { valid: false, error: `drive must be one of: ${ALLOWED_DRIVES.join(', ')}` };
  }

  return { valid: true };
}

// GET handler: Fetch dealer's listings
export async function GET(request: NextRequest) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Build query
    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('dealer_id', dealer.id);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: exclude soft-deleted listings
      query = query.not('status', 'in', '(deleted,archived)');
    }

    // Apply sorting
    if (sort === 'price_asc') {
      query = query.order('price_usd', { ascending: true });
    } else if (sort === 'price_desc') {
      query = query.order('price_usd', { ascending: false });
    } else if (sort === 'mileage_asc') {
      query = query.order('mileage_km', { ascending: true });
    } else {
      // 'newest' by default
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    const { data: listings, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        listings: listings || [],
        total: count || 0,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /dealer/listings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler: Create a new listing
export async function POST(request: NextRequest) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredValidation = validateRequiredFields(body);
    if (!requiredValidation.valid) {
      return NextResponse.json(
        { error: 'Missing required fields', missing: requiredValidation.missing },
        { status: 400 }
      );
    }

    // Validate field types and enum values
    const typeValidation = validateFieldTypes(body);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check listing limit
    const { count, error: countError } = await supabase
      .from('listings')
      .select('id', { count: 'exact' })
      .eq('dealer_id', dealer.id)
      .not('status', 'in', '(deleted,archived)');

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (count && count >= dealer.listing_limit) {
      return NextResponse.json(
        { error: 'Listing limit reached. Upgrade your subscription to add more listings.' },
        { status: 403 }
      );
    }

    // Generate slug
    const slug = generateSlug(body.make, body.model, body.year, dealer.city);

    // Prepare listing data
    const listingData = {
      dealer_id: dealer.id,
      slug,
      make: body.make.trim(),
      model: body.model.trim(),
      year: body.year,
      price_usd: body.price_usd,
      mileage_km: body.mileage_km,
      body_type: body.body_type,
      transmission: body.transmission,
      fuel_type: body.fuel_type,
      colour: body.colour.trim(),
      condition: body.condition,
      drive: body.drive,
      description: body.description ? body.description.trim() : null,
      vin: body.vin ? body.vin.trim() : null,
      is_special: body.is_special || false,
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    // Insert listing
    const { data: createdListing, error: insertError } = await supabase
      .from('listings')
      .insert([listingData])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(createdListing, { status: 201 });
  } catch (err) {
    console.error('POST /dealer/listings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
