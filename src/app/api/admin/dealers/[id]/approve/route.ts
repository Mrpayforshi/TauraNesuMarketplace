import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * PATCH /api/admin/dealers/[id]/approve
 * Sets dealer status to 'active'.
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
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('dealers')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Dealer not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ dealer: data });
  } catch (error) {
    console.error('Admin dealer approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
