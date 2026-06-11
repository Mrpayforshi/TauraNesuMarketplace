import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

const VALID_STATUSES = ['pending', 'under_review', 'valued', 'completed', 'rejected'];

/**
 * PATCH /api/admin/submissions/[id]
 * Update a submission: set valuation_usd and/or advance status.
 * Body: { status?: string, valuation_usd?: number, admin_notes?: string }
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
          { error: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if ('valuation_usd' in body) {
      const val = Number(body.valuation_usd);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { error: 'valuation_usd must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.valuation_usd = val;
    }

    if ('admin_notes' in body) {
      updateData.admin_notes = body.admin_notes ?? null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sell_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Submission not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ submission: data });
  } catch (error) {
    console.error('Admin submission PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
