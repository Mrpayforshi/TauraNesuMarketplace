import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// Flat commission rate charged to the dealer on a self-reported closed
// deal. Kept in one place so it only ever needs to change here.
const COMMISSION_RATE = 0.03;

/**
 * POST /api/dealer/submissions/[id]/close
 * Dealer self-reports a deal as sold. Creates a `transactions` row at
 * status 'pending' with commission auto-computed at the flat rate above.
 *
 * This is a self-report, not a confirmation — the deal only counts as
 * verified once an admin reviews it against what the seller confirms and
 * marks it 'completed' via PATCH /api/admin/submissions/[id]/transaction.
 * Until then it just surfaces in the admin dashboard as pending.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissionId = params.id;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const dealValue = body.deal_value_usd;
    if (typeof dealValue !== 'number' || !Number.isFinite(dealValue) || dealValue <= 0) {
      return NextResponse.json(
        { error: 'deal_value_usd is required and must be a positive number' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Confirm this dealer actually holds the accepted lead on this
    // submission — a dealer can't self-report a sale on a submission they
    // never won.
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, action')
      .eq('dealer_id', dealer.id)
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (leadError) {
      return NextResponse.json(
        { error: 'Failed to verify lead' },
        { status: 500 }
      );
    }

    if (!lead || lead.action !== 'accepted') {
      return NextResponse.json(
        { error: 'You have not accepted this submission' },
        { status: 403 }
      );
    }

    // Confirm the submission itself is in a state that can be closed.
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'accepted') {
      return NextResponse.json(
        {
          error: `Cannot report a sale from status "${submission.status}". Submission must be "accepted".`,
        },
        { status: 409 }
      );
    }

    // Don't allow a second self-report on top of an existing one — surface
    // whatever's already there instead of creating a duplicate row.
    const { data: existingTransaction, error: existingError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('submission_id', submissionId)
      .eq('dealer_id', dealer.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: 'Failed to check existing transaction' },
        { status: 500 }
      );
    }

    if (existingTransaction) {
      return NextResponse.json(
        {
          error: `A transaction already exists for this submission (status: ${existingTransaction.status}).`,
        },
        { status: 409 }
      );
    }

    const commissionUsd = Math.round(dealValue * COMMISSION_RATE * 100) / 100;

    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        submission_id: submissionId,
        dealer_id: dealer.id,
        deal_value_usd: dealValue,
        commission_usd: commissionUsd,
        lead_fee_usd: 0,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to record transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error) {
    console.error('Dealer close submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
