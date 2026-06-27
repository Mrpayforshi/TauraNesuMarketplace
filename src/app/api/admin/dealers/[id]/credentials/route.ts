import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';
import { normalizeZimPhone, phoneToSyntheticEmail } from '@/lib/phone-auth';

/**
 * POST /api/admin/dealers/[id]/credentials
 * Admin sets or resets a dealer's login, by email OR phone + password.
 *
 * Supabase Auth requires an email under the hood regardless of which
 * identifier admin picks. For phone logins, that email is a deterministic,
 * non-deliverable synthetic address derived from the normalized phone
 * (see lib/phone-auth.ts) — the dealer never sees it and just types their
 * phone number to sign in. This is intentionally NOT real phone/OTP auth;
 * that's a later upgrade once SMS delivery is wired up.
 *
 * - If the dealer has no auth_user_id yet: creates a new, pre-confirmed
 *   Supabase Auth user and links it to the dealer.
 * - If the dealer already has an auth_user_id: updates that existing
 *   auth user's email/password instead of creating a second one — the
 *   dealers table has a UNIQUE constraint on auth_user_id, so creating a
 *   fresh user here would just orphan the old one rather than replace it.
 *
 * Body: { identifierType: 'email' | 'phone', identifier: string, password: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { identifierType, identifier, password } = body;

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

    // Resolve the identifier into the email Supabase Auth actually uses,
    // and (for phone) the normalized phone to store in login_phone.
    let authEmail: string;
    let loginPhone: string | null = null;

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

    const supabase = createAdminClient();

    const { data: dealer, error: dealerError } = await supabase
      .from('dealers')
      .select('id, auth_user_id')
      .eq('id', id)
      .single();

    if (dealerError || !dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // A phone identifier needs to be unique up front — Supabase would
    // catch a duplicate *synthetic email* via its own auth error, but
    // checking login_phone directly gives a clearer message ("phone
    // already in use" rather than a confusing email-collision error that
    // exposes the synthetic-email implementation detail).
    if (loginPhone) {
      const { data: phoneCollision } = await supabase
        .from('dealers')
        .select('id')
        .eq('login_phone', loginPhone)
        .neq('id', id)
        .maybeSingle();

      if (phoneCollision) {
        return NextResponse.json(
          { error: 'That phone number is already used by another dealer' },
          { status: 409 }
        );
      }
    }

    function authErrorMessage(message: string, fallbackEntity: string): string {
      const lower = message.toLowerCase();
      if (lower.includes('already registered') || lower.includes('already exists')) {
        return `That ${fallbackEntity} is already in use`;
      }
      return message;
    }

    if (dealer.auth_user_id) {
      // Reset path: update the existing auth user in place.
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        dealer.auth_user_id,
        { email: authEmail, password, email_confirm: true }
      );

      if (updateError) {
        return NextResponse.json(
          { error: authErrorMessage(updateError.message, identifierType) },
          { status: 409 }
        );
      }

      const { error: phoneUpdateError } = await supabase
        .from('dealers')
        .update({ login_phone: loginPhone })
        .eq('id', id);

      if (phoneUpdateError) {
        return NextResponse.json({ error: phoneUpdateError.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Login updated' }, { status: 200 });
    }

    // First-time path: create a new pre-confirmed auth user and link it.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: authErrorMessage(authError.message, identifierType) },
        { status: 409 }
      );
    }
    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create login' }, { status: 500 });
    }

    const { error: linkError } = await supabase
      .from('dealers')
      .update({ auth_user_id: authData.user.id, login_phone: loginPhone })
      .eq('id', id);

    if (linkError) {
      // Dealer link failed after the auth user was created — clean up so
      // a retry doesn't hit "already exists" for an orphaned user.
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Login created' }, { status: 201 });
  } catch (error) {
    console.error('Admin dealer credentials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
