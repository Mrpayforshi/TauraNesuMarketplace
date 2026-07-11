import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

type ViewType = 'new' | 'accepted' | 'passed';

interface SubmissionImage {
  id: string;
  submission_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

interface SubmissionResponse {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  transmission: string;
  fuel_type: string;
  colour: string;
  condition: string;
  intent: string;
  known_issues: string | null;
  additional_notes: string | null;
  seller_city: string;
  valuation_min_usd: number;
  valuation_max_usd: number;
  status: string;
  created_at: string;
  submission_images: SubmissionImage[];
  seller_name?: string;
  seller_phone?: string;
  seller_whatsapp?: string;
  // Only present for the 'accepted' view — this dealer's self-reported
  // transaction on this submission, if one exists.
  transaction?: {
    id: string;
    status: string;
    deal_value_usd: number;
  } | null;
}

/**
 * GET /api/dealer/submissions
 * Retrieve dealer submissions filtered by view (new, accepted, passed).
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Parse query param
    const url = new URL(request.url);
    const view = (url.searchParams.get('view') || 'new') as ViewType;

    if (!['new', 'accepted', 'passed'].includes(view)) {
      return NextResponse.json(
        { error: 'Invalid view parameter' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    let submissionIds: string[] = [];

    // Step 3: Query logic based on view
    if (view === 'new') {
      // First get all submission IDs this dealer has already acted on.
      // A `leads` row with action = null means the lead was assigned to
      // this dealer but no decision has been made yet — it still belongs
      // in the "new" tab. Only rows with a non-null action (accepted /
      // passed) count as "already acted on" and should be excluded here.
      const { data: actedLeads } = await supabase
        .from('leads')
        .select('submission_id')
        .eq('dealer_id', dealer.id)
        .not('action', 'is', null);

      const actedIds = (actedLeads || []).map((l: any) => l.submission_id);

      // Then fetch submissions not in that list
      let submissionsQuery = supabase
        .from('submissions')
        .select('id')
        .in('status', ['valued', 'in_pipeline']);

      if (actedIds.length > 0) {
        // NOTE: PostgREST's in.() list takes raw, unquoted values for
        // plain identifiers like UUIDs — wrapping each id in '...' here
        // previously made Postgres try to cast the literal string
        // "'<uuid>'" (quotes included) to type uuid, which always failed
        // with "invalid input syntax for type uuid". No quoting needed.
        submissionsQuery = submissionsQuery.not('id', 'in', `(${actedIds.join(',')})`);
      }

      const { data: submissions, error: submissionError } = await submissionsQuery;

      if (submissionError) throw submissionError;

      submissionIds = submissions?.map((s: any) => s.id) || [];
    } else if (view === 'accepted') {
      // Submissions where a leads row exists with action = 'accepted'
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('submission_id')
        .eq('dealer_id', dealer.id)
        .eq('action', 'accepted');

      if (leadsError) throw leadsError;

      submissionIds = leads?.map((l) => l.submission_id) || [];
    } else if (view === 'passed') {
      // Submissions where a leads row exists with action = 'passed'
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('submission_id')
        .eq('dealer_id', dealer.id)
        .eq('action', 'passed');

      if (leadsError) throw leadsError;

      submissionIds = leads?.map((l) => l.submission_id) || [];
    }

    // Fetch full submission data with images
    let submissions: SubmissionResponse[] = [];

    if (submissionIds.length > 0) {
      const { data: submissionData, error: fetchError } = await supabase
        .from('submissions')
        .select(
          `
          id,
          make,
          model,
          year,
          mileage_km,
          transmission,
          fuel_type,
          colour,
          condition,
          intent,
          known_issues,
          additional_notes,
          seller_name,
          seller_phone,
          seller_whatsapp,
          seller_city,
          valuation_min_usd,
          valuation_max_usd,
          status,
          created_at,
          submission_images (
            id,
            submission_id,
            image_url,
            display_order,
            created_at
          )
          `
        )
        .in('id', submissionIds);

      if (fetchError) throw fetchError;

      // For the accepted view, pull this dealer's own transactions for
      // these submissions so the UI can show "Reported" / "Closed" instead
      // of always offering the Mark as Sold button.
      let transactionsBySubmission: Record<
        string,
        { id: string; status: string; deal_value_usd: number }
      > = {};

      if (view === 'accepted') {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id, submission_id, status, deal_value_usd')
          .eq('dealer_id', dealer.id)
          .in('submission_id', submissionIds);

        if (txError) throw txError;

        transactionsBySubmission = Object.fromEntries(
          (txData || []).map((t) => [
            t.submission_id,
            { id: t.id, status: t.status, deal_value_usd: t.deal_value_usd },
          ])
        );
      }

      submissions = (submissionData || []).map((submission) => {
        const response: SubmissionResponse = {
          id: submission.id,
          make: submission.make,
          model: submission.model,
          year: submission.year,
          mileage_km: submission.mileage_km,
          transmission: submission.transmission,
          fuel_type: submission.fuel_type,
          colour: submission.colour,
          condition: submission.condition,
          intent: submission.intent,
          known_issues: submission.known_issues,
          additional_notes: submission.additional_notes,
          seller_city: submission.seller_city,
          valuation_min_usd: submission.valuation_min_usd,
          valuation_max_usd: submission.valuation_max_usd,
          status: submission.status,
          created_at: submission.created_at,
          submission_images: submission.submission_images || [],
        };

        // Step 5: Only include seller contact for 'accepted' view
        if (view === 'accepted') {
          response.seller_name = submission.seller_name;
          response.seller_phone = submission.seller_phone;
          response.seller_whatsapp = submission.seller_whatsapp;
          response.transaction = transactionsBySubmission[submission.id] ?? null;
        }

        return response;
      });
    }

    // Step 6: Return response
    return NextResponse.json(
      {
        submissions,
        total: submissions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Submissions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
