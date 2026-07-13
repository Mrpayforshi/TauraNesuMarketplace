import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

const VALID_STATUSES = ['pending', 'valued', 'in_pipeline', 'accepted', 'closed', 'rejected'];

// Allowed forward transitions. 'rejected' is reachable from any non-terminal status.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['valued', 'rejected'],
  valued: ['in_pipeline', 'rejected'],
  in_pipeline: ['accepted', 'rejected'],
  accepted: ['closed'],
  closed: [],
  rejected: [],
};

/**
 * GET /api/admin/submissions/[id]
 * Fetch a single submission, with images and dealer leads.
 * (There was previously no way to fetch a submission on its own — only
 * the full list endpoint existed.)
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

    const { data: submission, error } = await supabase
      .from('submissions')
      .select(`
        *,
        submission_images ( id, image_url, display_order ),
        leads ( id, dealer_id, action, created_at, dealers ( id, name ) )
      `)
      .eq('id', id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission }, { status: 200 });
  } catch (error) {
    console.error('GET /admin/submissions/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/submissions/[id]
 * Set valuation range, update status, add notes, or reject with a reason.
 * Body: { status?, valuation_min_usd?, valuation_max_usd?, valuation_notes?, rejection_reason? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch current status first so we can validate the transition.
    const { data: existing, error: fetchError } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if ('status' in body) {
      const newStatus = body.status as string;
      if (!VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      if (newStatus !== existing.status) {
        const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
        if (!allowed.includes(newStatus)) {
          return NextResponse.json(
            { error: `Cannot move from "${existing.status}" to "${newStatus}"` },
            { status: 409 }
          );
        }
      }
      updateData.status = newStatus;
    }

    if ('valuation_min_usd' in body) {
      const val = Number(body.valuation_min_usd);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { error: 'valuation_min_usd must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.valuation_min_usd = val;
    }

    if ('valuation_max_usd' in body) {
      const val = Number(body.valuation_max_usd);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { error: 'valuation_max_usd must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.valuation_max_usd = val;
    }

    if (
      typeof updateData.valuation_min_usd === 'number' &&
      typeof updateData.valuation_max_usd === 'number' &&
      updateData.valuation_max_usd < updateData.valuation_min_usd
    ) {
      return NextResponse.json(
        { error: 'valuation_max_usd cannot be less than valuation_min_usd' },
        { status: 400 }
      );
    }

    if ('valuation_notes' in body) {
      updateData.valuation_notes = body.valuation_notes ?? null;
    }

    if ('rejection_reason' in body) {
      const reason = typeof body.rejection_reason === 'string' ? body.rejection_reason.trim() : '';
      updateData.rejection_reason = reason || null;
    }

    // Rejecting requires a reason — enforce it whether or not the caller
    // also set rejection_reason in the same request.
    if (updateData.status === 'rejected') {
      const reasonProvided =
        typeof updateData.rejection_reason === 'string' && updateData.rejection_reason.length > 0;
      if (!reasonProvided) {
        return NextResponse.json(
          { error: 'rejection_reason is required when rejecting a submission' },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('submissions')
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
