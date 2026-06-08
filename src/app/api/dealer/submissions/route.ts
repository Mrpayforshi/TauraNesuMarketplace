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
        { error: 'Authentication required' },
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
      // Submissions with status 'valued' or 'in_pipeline' where no leads row exists for this dealer
      const { data: submissions, error: submissionError } = await supabase
        .from('submissions')
        .select('id')
        .in('status', ['valued', 'in_pipeline'])
        .not('id', 'in', 
          `(${await getLeadsSubquery(supabase, dealer.id, null)})`
        );

      if (submissionError && submissionError.code !== 'PGRST116') {
        throw submissionError;
      }

      submissionIds = submissions?.map((s) => s.id) || [];
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

/**
 * Helper function to build a subquery for leads.
 * Returns submission IDs that have a leads row for the given dealer with optional action filter.
 */
async function getLeadsSubquery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any, // Supabase client type varies by auth context; typed as any to accept both createServerClient and createServerSupabaseClient
  dealerId: string,
  action: string | null
): Promise<string> {
  let query = supabase.from('leads').select('submission_id').eq('dealer_id', dealerId);

  if (action) {
    query = query.eq('action', action);
  }

  const { data } = await query;
  const ids = (data || []).map((l: any) => // lead row shape not explicitly typed; submission_id is always present
  return ids || "''";
}
