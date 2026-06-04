import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()

  const [dealersRes, listingsRes] = await Promise.all([
    supabase
      .from('dealers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ])

  return NextResponse.json({
    verified_dealers: dealersRes.count ?? 0,
    active_listings: listingsRes.count ?? 0,
  })
}
