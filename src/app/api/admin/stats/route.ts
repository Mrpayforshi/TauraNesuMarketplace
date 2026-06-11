import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/stats
 * Returns platform-wide counts: dealers, listings, submissions, transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [dealers, listings, submissions, transactions] = await Promise.all([
      supabase.from('dealers').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('sell_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
    ]);

    // Breakdown counts by status
    const [activeListings, pendingListings, activeDealers, pendingDealers] =
      await Promise.all([
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('dealers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('dealers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

    return NextResponse.json({
      dealers: {
        total: dealers.count ?? 0,
        active: activeDealers.count ?? 0,
        pending: pendingDealers.count ?? 0,
      },
      listings: {
        total: listings.count ?? 0,
        active: activeListings.count ?? 0,
        pending: pendingListings.count ?? 0,
      },
      submissions: {
        total: submissions.count ?? 0,
      },
      transactions: {
        total: transactions.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
