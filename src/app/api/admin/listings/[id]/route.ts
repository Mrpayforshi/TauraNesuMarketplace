import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/listings/[id]
 * Fetch a single listing, with dealer info and full image gallery.
 * Admin can view any listing regardless of status or owning dealer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createAdminClient();

    const { data: listing, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        dealers ( id, name ),
        listing_images (
          id,
          image_url,
          display_order
        )
        `
      )
      .eq('id', id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ listing }, { status: 200 });
  } catch (err) {
    console.error('GET /admin/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
