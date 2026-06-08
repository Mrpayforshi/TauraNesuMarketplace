import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

const ALLOWED_CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Other'];

/**
 * GET /api/dealer/account
 * Retrieve authenticated dealer account details, subscription, and active listing count.
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Step 2: Fetch active subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier, price_usd, billing_start, billing_end, status')
      .eq('dealer_id', dealer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const subscription = subscriptionData && subscriptionData.length > 0
      ? subscriptionData[0]
      : null;

    // Step 3: Count active listings
   const { count: activeListingCount, error: listingsError } = await supabase
  .from('listings')
  .select('*', { count: 'exact', head: true })
  .eq('dealer_id', dealer.id)
  .eq('status', 'active');
    if (listingsError) {
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

    // Step 4: Return response
    const response = {
      dealer: {
        id: dealer.id,
        name: dealer.name,
        contact_name: dealer.contact_name,
        phone: dealer.phone,
        city: dealer.city,
        subscription_tier: dealer.subscription_tier,
        listing_limit: dealer.listing_limit,
        created_at: dealer.created_at,
      },
      subscription: subscription
        ? {
            tier: subscription.tier,
            price_usd: subscription.price_usd,
            billing_start: subscription.billing_start,
            billing_end: subscription.billing_end,
            status: subscription.status,
          }
        : null,
      active_listing_count: activeListingCount,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Account GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dealer/account
 * Update dealer account details (contact_name, phone, city only).
 */
export async function PATCH(request: NextRequest) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Parse body and extract allowed fields
    let body: Record<string, string | null | undefined>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Only allow these fields; silently strip others
    const updateData: Record<string, string | null> = {};

    if ('contact_name' in body) {
      updateData.contact_name = body.contact_name || null;
    }
    if ('phone' in body) {
      updateData.phone = body.phone || null;
    }
    if ('city' in body) {
      updateData.city = body.city || null;
    }

    // Step 3: Server-side validation
    if ('city' in updateData && updateData.city !== null) {
      if (!ALLOWED_CITIES.includes(updateData.city)) {
        return NextResponse.json(
          {
            error: `City must be one of: ${ALLOWED_CITIES.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    if ('phone' in updateData && updateData.phone !== null) {
      if (typeof updateData.phone !== 'string' || updateData.phone.trim() === '') {
        return NextResponse.json(
          { error: 'Phone must be a non-empty string' },
          { status: 400 }
        );
      }
    }

    // Step 4: Update the dealer row
    const supabase = createServerSupabaseClient();
    const { data: updatedDealer, error: updateError } = await supabase
      .from('dealers')
      .update(updateData)
      .eq('id', dealer.id)
      .select()
      .single();

    if (updateError || !updatedDealer) {
      return NextResponse.json(
        { error: 'Failed to update dealer' },
        { status: 500 }
      );
    }

    // Return updated dealer
    return NextResponse.json(
      {
        id: updatedDealer.id,
        name: updatedDealer.name,
        contact_name: updatedDealer.contact_name,
        phone: updatedDealer.phone,
        city: updatedDealer.city,
        subscription_tier: updatedDealer.subscription_tier,
        listing_limit: updatedDealer.listing_limit,
        created_at: updatedDealer.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
