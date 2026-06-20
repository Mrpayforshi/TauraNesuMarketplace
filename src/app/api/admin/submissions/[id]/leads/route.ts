import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/submissions/[id]/leads
// Lists all leads (dealer offers) for a single submission.
export async function GET(
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

  const { data, error } = await supabase
    .from('leads')
    .select(
      `
      id,
      dealer_id,
      submission_id,
      action,
      created_at,
      dealers (
        id,
        name,
        status
      )
      `
    )
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data });
}

// POST /api/admin/submissions/[id]/leads
// Body: { dealer_ids: string[] }
// Sends the submission to the selected dealers as leads (action = NULL = offered).
// Moves submission status valued -> in_pipeline.
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

  let body: { dealer_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const dealerIds = body.dealer_ids;

  if (!Array.isArray(dealerIds) || dealerIds.length === 0) {
    return NextResponse.json(
      { error: 'dealer_ids must be a non-empty array' },
      { status: 400 }
    );
  }

  // Confirm submission exists and is in a state that allows sending leads.
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

  if (submission.status !== 'valued' && submission.status !== 'in_pipeline') {
    return NextResponse.json(
      {
        error: `Cannot send leads from status "${submission.status}". Submission must be "valued" or already "in_pipeline".`,
      },
      { status: 409 }
    );
  }

  // Build lead rows for upsert (action left NULL = offered, awaiting dealer response).
  const leadRows = dealerIds.map((dealerId) => ({
    dealer_id: dealerId,
    submission_id: submissionId,
    action: null,
  }));

  const { data: insertedLeads, error: insertError } = await supabase
    .from('leads')
    .upsert(leadRows, {
      onConflict: 'dealer_id,submission_id',
      ignoreDuplicates: true,
    })
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Move valued -> in_pipeline (no-op if already in_pipeline).
  if (submission.status === 'valued') {
    const { error: statusError } = await supabase
      .from('submissions')
      .update({ status: 'in_pipeline' })
      .eq('id', submissionId);

    if (statusError) {
      return NextResponse.json(
        { error: `Leads created but status update failed: ${statusError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    leads: insertedLeads,
    status: 'in_pipeline',
  });
}
