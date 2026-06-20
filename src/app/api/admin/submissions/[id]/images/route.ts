import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * GET /api/admin/submissions/[id]/images
 * Lists images for a single submission, ordered by display_order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return err('Invalid submission ID');
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('submission_images')
      .select('id, image_url, display_order')
      .eq('submission_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    return NextResponse.json({ images: data ?? [] });
  } catch (error) {
    console.error('Admin submissions images GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
