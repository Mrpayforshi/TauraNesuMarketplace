import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

type ActionType = 'accepted' | 'passed';

/**
 * POST /api/dealer/submissions/[id]/action
 * Record dealer action on a submission (accepted or passed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // Step 2: Parse body and validate action
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
let body: Record<string, any>; // request body shape is validated manually below before use
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const action = body.action as ActionType;

    if (!action || !['accepted', 'passed'].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'accepted' or 'passed'" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Step 3: Fetch the submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(
        'id, status, seller_whatsapp, seller_name, year, make, model'
      )
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check submission status
    if (!['valued', 'in_pipeline'].includes(submission.status)) {
      return NextResponse.json(
        { error: 'Submission is not available for action' },
        { status: 400 }
      );
    }

    // Step 4: Check for existing leads row
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('id')
      .eq('dealer_id', dealer.id)
      .eq('submission_id', submissionId)
      .single();

    if (existingLead) {
      return NextResponse.json(
        { error: 'You have already acted on this submission' },
        { status: 409 }
      );
    }

    // Step 5: Insert into leads table
    const { error: insertError } = await supabase.from('leads').insert({
      dealer_id: dealer.id,
      submission_id: submissionId,
      action,
    });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to record action' },
        { status: 500 }
      );
    }

    // Step 6 & 7: Handle action-specific logic
    if (action === 'accepted') {
      // Update submission status to in_pipeline
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'in_pipeline' })
        .eq('id', submissionId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update submission' },
          { status: 500 }
        );
      }

      // Construct WhatsApp link
      const message = `Hi ${submission.seller_name}, I saw your ${submission.year} ${submission.make} ${submission.model} submission on TauraNesu and I am interested. Can we arrange an inspection?`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappLink = `https://wa.me/${submission.seller_whatsapp}?text=${encodedMessage}`;

      return NextResponse.json(
        {
          success: true,
          action: 'accepted',
          whatsapp_link: whatsappLink,
        },
        { status: 200 }
      );
    } else if (action === 'passed') {
      return NextResponse.json(
        {
          success: true,
          action: 'passed',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Submission action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
