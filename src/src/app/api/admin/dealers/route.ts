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
