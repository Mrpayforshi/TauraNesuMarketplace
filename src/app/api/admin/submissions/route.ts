import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/submissions
 * List all Sell Your Car submissions. Supports ?status= filter.
 *
 * NOTE: this previously selected '*' with no joins at all, so the images
 * and leads the frontend expects on every row were never actually being
 * fetched — the inline "Details" expand was rendering empty. Fixed here.
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
      .from('submissions')
      .select(`
        *,
        submission_images ( id, image_url, display_order ),
        leads ( id, dealer_id, action, created_at, dealers ( id, name ) )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch (error) {
    console.error('Admin submissions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
