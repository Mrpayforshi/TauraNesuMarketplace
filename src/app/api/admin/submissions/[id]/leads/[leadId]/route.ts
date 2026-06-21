import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH /api/admin/submissions/[id]/leads/[leadId]
// Body: { action: 'accepted' | 'passed' }
// Records a dealer's response to a lead offer.
// On the first "accepted" action for this submission, moves
// submission status in_pipeline -> accepted.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; leadId: string } }
) {
  const submissionId = params.id;
  const leadId = params.leadId;

  if (!submissionId || !leadId) {
    return NextResponse.json(
      { error: 'Missing submission id or lead id' },
      { status: 400 }
    );
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const action = body.action;

  if (action !== 'accepted' && action !== 'passed') {
    return NextResponse.json(
      { error: 'action must be "accepted" or "passed"' },
      { status: 400 }
    );
  }

  // Confirm the lead exists and belongs to this submission.
  const { data: lead, error: leadFetchError } = await supabase
    .from('leads')
    .select('id, submission_id, dealer_id, action')
    .eq('id', leadId)
    .eq('submission_id', submissionId)
    .single();

  if (leadFetchError || !lead) {
    return NextResponse.json(
      { error: 'Lead not found for this submission' },
      { status: 404 }
    );
  }

  // Confirm submission is still in a state where lead responses make sense.
  const { data: submission, error: submissionFetchError } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('id', submissionId)
    .single();

  if (submissionFetchError || !submission) {
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  }

  if (submission.status !== 'in_pipeline' && submission.status !== 'accepted') {
    return NextResponse.json(
      {
        error: `Cannot record lead response while submission status is "${submission.status}". Submission must be "in_pipeline" or already "accepted".`,
      },
      { status: 409 }
    );
  }

  // Update the lead row with the dealer's response.
  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update({ action })
    .eq('id', leadId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If this is the first "accepted" response, move submission -> accepted.
  let newStatus = submission.status;

  if (action === 'accepted' && submission.status === 'in_pipeline') {
    const { error: statusError } = await supabase
      .from('submissions')
      .update({ status: 'accepted' })
      .eq('id', submissionId);

    if (statusError) {
      return NextResponse.json(
        {
          error: `Lead updated but status update failed: ${statusError.message}`,
        },
        { status: 500 }
      );
    }

    newStatus = 'accepted';
  }

  return NextResponse.json({
    lead: updatedLead,
    submission_status: newStatus,
  });
}
