import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '../_guard'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  const [
    { count: totalDealers },
    { count: activeDealers },
    { count: pendingDealers },
    { count: totalListings },
    { count: activeListings },
    { count: pendingListings },
    { count: totalSubmissions },
    { count: pendingSubmissions },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('dealers').select('*', { count: 'exact', head: true }),
    supabase.from('dealers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('dealers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('transactions').select('deal_value_usd, commission_usd').eq('status', 'completed'),
  ])

  const totalDealValue = transactions?.reduce((sum, t) => sum + (t.deal_value_usd || 0), 0) ?? 0
  const totalCommission = transactions?.reduce((sum, t) => sum + (t.commission_usd || 0), 0) ?? 0

  return NextResponse.json({
    dealers: { total: totalDealers, active: activeDealers, pending: pendingDealers },
    listings: { total: totalListings, active: activeListings, pending_review: pendingListings },
    submissions: { total: totalSubmissions, pending: pendingSubmissions },
    transactions: {
      total: transactions?.length ?? 0,
      total_deal_value_usd: totalDealValue,
      total_commission_usd: totalCommission,
    },
  })
}
