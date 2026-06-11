import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/transactions
 * List all transactions, newest first.
 *
 * POST /api/admin/transactions
 * Create a new transaction record manually.
 * Body: { dealer_id, type, amount_usd, description? }
 */

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, type, amount_usd, description, created_at,
        dealers ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({ transactions: data ?? [] });
  } catch (error) {
    console.error('Admin transactions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { dealer_id, type, amount_usd, description } = body as {
      dealer_id?: string;
      type?: string;
      amount_usd?: number;
      description?: string;
    };

    if (!dealer_id || typeof dealer_id !== 'string') {
      return NextResponse.json({ error: 'dealer_id is required' }, { status: 400 });
    }
    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }
    const amount = Number(amount_usd);
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: 'amount_usd must be a non-negative number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        dealer_id,
        type,
        amount_usd: amount,
        description: description ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (error) {
    console.error('Admin transactions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
