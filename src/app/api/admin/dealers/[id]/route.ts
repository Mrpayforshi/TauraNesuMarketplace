import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

const VALID_STATUSES = ['pending', 'active', 'suspended'];
const VALID_TIERS = ['basic', 'standard', 'premium'];

/**
 * PATCH /api/admin/dealers/[id]
 * Update dealer status, subscription_tier, listing_limit, or notes.
 * Body: { status?, subscription_tier?, listing_limit?, notes? }
 */
export async function PATCH(
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

    const updateData: Record<string, unknown> = {};

    if ('status' in body) {
      if (!VALID_STATUSES.includes(body.status as string)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if ('subscription_tier' in body) {
      if (!VALID_TIERS.includes(body.subscription_tier as string)) {
        return NextResponse.json(
          { error: `subscription_tier must be one of: ${VALID_TIERS.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.subscription_tier = body.subscription_tier;
    }

    if ('listing_limit' in body) {
      const limit = Number(body.listing_limit);
      if (!Number.isInteger(limit) || limit < 0) {
        return NextResponse.json(
          { error: 'listing_limit must be a non-negative integer' },
          { status: 400 }
        );
      }
      updateData.listing_limit = limit;
    }

    if ('notes' in body) {
      updateData.notes = body.notes ?? null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('dealers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Dealer not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ dealer: data });
  } catch (error) {
    console.error('Admin dealer PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
