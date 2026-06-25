import { getAuthUser } from './auth';
import { createServerSupabaseClient } from './supabase';

export type Dealer = {
  id: string;
  auth_user_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  status: 'pending' | 'active' | 'suspended';
  subscription_tier: 'basic' | 'standard' | 'premium';
  listing_limit: number;
  notes: string | null;
  created_at: string;
};

export async function getDealerFromRequest(
  request: Request
): Promise<Dealer | null> {
  // Step 1: Get the authenticated user
  const user = await getAuthUser(request);
  if (!user) {
    return null;
  }

  // Step 2: Extract the Bearer token directly from the request headers
  // (ground truth — do not rely on next/headers here)
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  // Step 3: Query the dealers table for an active dealer matching this user
  const supabase = createServerSupabaseClient(token);
  const { data, error } = await supabase
    .from('dealers')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single();

  // Step 4: If no dealer row is found or there's an error, return null
  if (error || !data) {
    return null;
  }

  // Step 5: Return the dealer row
  return data as Dealer;
}
