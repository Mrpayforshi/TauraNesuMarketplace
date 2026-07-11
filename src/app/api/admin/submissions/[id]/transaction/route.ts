import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/submissions/[id]/transaction
// Body: { dealer_id: string, deal_value_usd: number, commission_usd: number, lead_fee_usd: number }
// Creates a transaction record. Requires submission status "accepted".
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const submissionId = params.id;

  if (!submissionId) {
    return NextResponse.json(
      { error: 'Missing submission id' },
      { status: 400 }
    );
  }

  let body: {
    dealer_id?: string;
    deal_value_usd?: number;
    commission_usd?: number;
    lead_fee_usd?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { dealer_id, deal_value_usd } = body;

  if (!dealer_id) {
    return NextResponse.json(
      { error: 'dealer_id is required' },
      { status: 400 }
    );
  }

  if (typeof deal_value_usd !== 'number' || deal_value_usd < 0) {
    return NextResponse.json(
      { error: 'deal_value_usd is required and must be a number' },
      { status: 400 }
    );
  }

  // commission_usd and lead_fee_usd are optional. The admin UI's form
  // fields for these are optional, but this route used to require both as
  // numbers — sending an empty field serialized to `undefined`, which
  // dropped the key from the JSON body entirely and always 400'd. Default
  // commission to the standard flat 3% of deal value when not supplied.
  const COMMISSION_RATE = 0.03;
  const commission_usd =
    typeof body.commission_usd === 'number'
      ? body.commission_usd
      : Math.round(deal_value_usd * COMMISSION_RATE * 100) / 100;
  const lead_fee_usd = typeof body.lead_fee_usd === 'number' ? body.lead_fee_usd : 0;

  // Confirm submission exists and is in the correct state.
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  }

  if (submission.status !== 'accepted') {
    return NextResponse.json(
      {
        error: `Cannot create transaction from status "${submission.status}". Submission must be "accepted".`,
      },
      { status: 409 }
    );
  }

  // Confirm the dealer has an accepted lead on this submission.
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, action')
    .eq('submission_id', submissionId)
    .eq('dealer_id', dealer_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json(
      { error: 'No lead found for this dealer on this submission' },
      { status: 404 }
    );
  }

  if (lead.action !== 'accepted') {
    return NextResponse.json(
      { error: 'This dealer has not accepted the lead for this submission' },
      { status: 409 }
    );
  }

  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      submission_id: submissionId,
      dealer_id,
      deal_value_usd,
      commission_usd,
      lead_fee_usd,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ transaction });
}

// PATCH /api/admin/submissions/[id]/transaction
// Body: { transaction_id: string, status: 'completed' | 'disputed' }
// Closes (or marks disputed) a transaction. On status "completed",
// moves submission status accepted -> closed and sets closed_at.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const submissionId = params.id;

  if (!submissionId) {
    return NextResponse.json(
      { error: 'Missing submission id' },
      { status: 400 }
    );
  }

  let body: { transaction_id?: string; status?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { transaction_id, status } = body;

  if (!transaction_id) {
    return NextResponse.json(
      { error: 'transaction_id is required' },
      { status: 400 }
    );
  }

  if (status !== 'completed' && status !== 'disputed') {
    return NextResponse.json(
      { error: 'status must be "completed" or "disputed"' },
      { status: 400 }
    );
  }

  // Confirm transaction exists and belongs to this submission.
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('id, submission_id, status')
    .eq('id', transaction_id)
    .eq('submission_id', submissionId)
    .single();

  if (fetchError || !transaction) {
    return NextResponse.json(
      { error: 'Transaction not found for this submission' },
      { status: 404 }
    );
  }

  const updatePayload: { status: string; closed_at?: string } = { status };

  if (status === 'completed') {
    updatePayload.closed_at = new Date().toISOString();
  }

  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', transaction_id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let newSubmissionStatus: string | null = null;

  if (status === 'completed') {
    const { error: statusError } = await supabase
      .from('submissions')
      .update({ status: 'closed' })
      .eq('id', submissionId);

    if (statusError) {
      return NextResponse.json(
        {
          error: `Transaction updated but submission status update failed: ${statusError.message}`,
        },
        { status: 500 }
      );
    }

    newSubmissionStatus = 'closed';
  }

  return NextResponse.json({
    transaction: updatedTransaction,
    submission_status: newSubmissionStatus,
  });
}
