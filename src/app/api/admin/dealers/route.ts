import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/dealers
 * List all dealers. Supports ?status=pending|active|suspended filter.
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
      .from('dealers')
      .select('id, name, contact_name, phone, city, status, subscription_tier, listing_limit, notes, created_at')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch dealers' }, { status: 500 });
    }

    return NextResponse.json({ dealers: data ?? [] });
  } catch (error) {
    console.error('Admin dealers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ALLOWED_TIERS = ['basic', 'standard', 'premium'];

/**
 * POST /api/admin/dealers
 * Admin creates a new dealer record directly (no self-registration flow).
 * Defaults to status 'active' since admin is vouching for the dealer.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      contact_name,
      phone,
      city,
      subscription_tier,
      listing_limit,
      notes,
    } = body;

    // Required field
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Validate subscription_tier if provided
    if (subscription_tier !== undefined && !ALLOWED_TIERS.includes(subscription_tier)) {
      return NextResponse.json(
        { error: `subscription_tier must be one of: ${ALLOWED_TIERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate listing_limit if provided
    if (listing_limit !== undefined) {
      if (typeof listing_limit !== 'number' || !Number.isInteger(listing_limit) || listing_limit < 0) {
        return NextResponse.json(
          { error: 'listing_limit must be a non-negative integer' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    const insertPayload = {
      name: name.trim(),
      contact_name: contact_name?.trim() || null,
      phone: phone?.trim() || null,
      city: city?.trim() || null,
      status: 'active', // admin-created dealers are active immediately
      subscription_tier: subscription_tier || 'basic',
      listing_limit: listing_limit ?? 20,
      notes: notes?.trim() || null,
    };

    const { data: dealer, error: insertError } = await supabase
      .from('dealers')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ dealer }, { status: 201 });
  } catch (error) {
    console.error('Admin dealers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
