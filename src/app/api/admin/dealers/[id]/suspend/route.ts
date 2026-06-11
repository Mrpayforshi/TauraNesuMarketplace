import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * PATCH /api/admin/dealers/[id]/suspend
 * Sets dealer status to 'suspended'. Accepts optional { reason } in body.
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

    let notes: string | null = null;
    try {
      const body = await request.json();
      notes = body.reason ?? null;
    } catch {
      // body is optional — ignore parse failures
    }

    const supabase = createAdminClient();

    const updatePayload: Record<string, string | null> = { status: 'suspended' };
    if (notes !== null) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('dealers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Dealer not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ dealer: data });
  } catch (error) {
    console.error('Admin dealer suspend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
