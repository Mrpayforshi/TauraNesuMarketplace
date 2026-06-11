import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * PATCH /api/admin/listings/[id]/reject
 * Sets listing status to 'rejected'. Requires { reason } in body.
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

    let reason: string;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        { error: 'A rejection reason is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Listing not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ listing: data });
  } catch (error) {
    console.error('Admin listing reject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
