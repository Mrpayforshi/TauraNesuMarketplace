import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getAuthUser, unauthorizedResponse } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { listing_id: string } }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorizedResponse()

  const { listing_id } = params

  if (!listing_id || typeof listing_id !== 'string') {
    return Response.json({ error: 'listing_id is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listing_id)

  if (error) {
    console.error('[DELETE /api/buyer/favourites/[listing_id]]', error)
    return Response.json({ error: 'Failed to remove favourite' }, { status: 500 })
  }

  return Response.json({ message: 'Listing removed from favourites' })
}
