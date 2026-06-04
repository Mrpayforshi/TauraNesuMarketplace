import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// Dealer-allowed statuses
const DEALER_ALLOWED_STATUSES = ['pending_review', 'draft', 'sold', 'archived'];

// PATCH handler: Update listing status
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
    const { status } = body;

    // Check if status is provided
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'Status is required and must be a string' }, { status: 400 });
    }

    // Check if attempting to set deleted status
    if (status === 'deleted') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if status is dealer-allowed
    if (!DEALER_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Dealers can set: pending_review, draft, sold, archived' },
        { status: 400 }
      );
    }

    // Update the listing status
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', id)
      .eq('dealer_id', dealer.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (err) {
    console.error('PATCH /dealer/listings/[id]/status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
