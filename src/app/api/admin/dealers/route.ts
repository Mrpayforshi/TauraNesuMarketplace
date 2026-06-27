import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';
import { normalizeZimPhone, phoneToSyntheticEmail } from '@/lib/phone-auth';

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
      .select('id, name, contact_name, phone, city, status, subscription_tier, listing_limit, notes, created_at, auth_user_id, login_phone')
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
      identifierType,
      identifier,
      password,
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

    // Login credentials are optional, but if any of the three is provided
    // all three must be — there's no valid partial state.
    const wantsCredentials = identifierType !== undefined || identifier !== undefined || password !== undefined;
    let authEmail = '';
    let loginPhone: string | null = null;

    if (wantsCredentials) {
      if (identifierType !== 'email' && identifierType !== 'phone') {
        return NextResponse.json(
          { error: "identifierType must be 'email' or 'phone'" },
          { status: 400 }
        );
      }
      if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        return NextResponse.json({ error: 'identifier is required' }, { status: 400 });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }

      if (identifierType === 'email') {
        if (!identifier.includes('@')) {
          return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }
        authEmail = identifier.trim().toLowerCase();
      } else {
        const normalized = normalizeZimPhone(identifier);
        if (!normalized) {
          return NextResponse.json(
            { error: 'Enter a valid Zimbabwean phone number, e.g. 0771234567' },
            { status: 400 }
          );
        }
        loginPhone = normalized;
        authEmail = phoneToSyntheticEmail(normalized);
      }
    }

    const supabase = createAdminClient();

    // Phone identifiers need an explicit uniqueness check up front — a
    // collision on the underlying synthetic email would otherwise surface
    // as a confusing "email already exists" error that leaks the
    // synthetic-email implementation detail to the admin UI.
    if (loginPhone) {
      const { data: phoneCollision } = await supabase
        .from('dealers')
        .select('id')
        .eq('login_phone', loginPhone)
        .maybeSingle();

      if (phoneCollision) {
        return NextResponse.json(
          { error: 'That phone number is already used by another dealer' },
          { status: 409 }
        );
      }
    }

    // Create the login first (if requested) so a failure here never leaves
    // a half-created dealer row behind. email_confirm: true skips the
    // confirmation email entirely — admin is vouching for this account.
    let authUserId: string | null = null;
    if (wantsCredentials) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        const lower = authError.message.toLowerCase();
        const msg = lower.includes('already registered') || lower.includes('already exists')
          ? `That ${identifierType} is already in use`
          : authError.message;
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create login' }, { status: 500 });
      }
      authUserId = authData.user.id;
    }

    const insertPayload = {
      name: name.trim(),
      contact_name: contact_name?.trim() || null,
      phone: phone?.trim() || null,
      city: city?.trim() || null,
      status: 'active', // admin-created dealers are active immediately
      subscription_tier: subscription_tier || 'basic',
      listing_limit: listing_limit ?? 20,
      notes: notes?.trim() || null,
      auth_user_id: authUserId,
      login_phone: loginPhone,
    };

    const { data: dealer, error: insertError } = await supabase
      .from('dealers')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      // The dealer row failed after the auth user was already created —
      // clean up the orphaned auth user so a retry doesn't hit "email
      // already exists" for an account that has no dealer attached to it.
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ dealer }, { status: 201 });
  } catch (error) {
    console.error('Admin dealers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
