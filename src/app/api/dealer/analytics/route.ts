import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET handler: Fetch dealer analytics
 * 
 * Query params:
 * - days: 30 | 60 | 90 (default: 30)
 * 
 * Response:
 * {
 *   "period_days": 30,
 *   "active_listings": 5,
 *   "listings": [
 *     { id, make, model, year, price_usd, status, view_count, created_at },
 *     ...
 *   ],
 *   "leads_received": 12,
 *   "pipeline": {
 *     "accepted": 8,
 *     "passed": 4
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '30';
    const validDays = ['30', '60', '90'];
    const days = validDays.includes(daysParam) ? parseInt(daysParam, 10) : 30;

    // Calculate start_date as now() - days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString();

    const supabase = createServerSupabaseClient();

    // Step 3a: Get active listing count
    const { count: activeListingCount, error: activeListingsError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealer.id)
      .eq('status', 'active');

    if (activeListingsError) {
      console.error('Error fetching active listings count:', activeListingsError);
      return NextResponse.json(
        { error: 'Failed to fetch active listings' },
        { status: 500 }
      );
    }

    // Step 3b: Get listings performance (exclude soft-deleted listings)
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, make, model, year, price_usd, status, created_at')
      .eq('dealer_id', dealer.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    // TODO: implement view tracking post-launch
    const listingsWithViews = (listings || []).map((listing) => ({
      ...listing,
      view_count: 0,
    }));

    // Step 3c: Get leads received count (within the period)
    const { count: leadsReceivedCount, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealer.id)
      .gte('created_at', startDateISO);

    if (leadsError) {
      console.error('Error fetching leads count:', leadsError);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Step 3d: Get pipeline stats (count of leads by action)
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('leads')
      .select('action')
      .eq('dealer_id', dealer.id);

    if (pipelineError) {
      console.error('Error fetching pipeline data:', pipelineError);
      return NextResponse.json(
        { error: 'Failed to fetch pipeline data' },
        { status: 500 }
      );
    }

    // Count accepted and passed
    let acceptedCount = 0;
    let passedCount = 0;

    (pipelineData || []).forEach((lead) => {
      if (lead.action === 'accepted') {
        acceptedCount++;
      } else if (lead.action === 'passed') {
        passedCount++;
      }
    });

    // Step 4: Return response
    return NextResponse.json(
      {
        period_days: days,
        active_listings: activeListingCount || 0,
        listings: listingsWithViews,
        leads_received: leadsReceivedCount || 0,
        pipeline: {
          accepted: acceptedCount,
          passed: passedCount,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /dealer/analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
