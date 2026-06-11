import { createAdminClient } from './supabase';

export interface AdminUser {
  id: string;
  email?: string;
}

/**
 * Validates that the request comes from an authenticated admin user.
 * Checks app_metadata.role === 'admin' using the service role client
 * so the check cannot be spoofed by the user's own JWT claims.
 *
 * Returns the admin user object on success, null on failure.
 */
export async function getAdminFromRequest(
  request: Request
): Promise<AdminUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7);

    // Use admin client to verify token — this lets us read app_metadata
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    // Check app_metadata.role set server-side (cannot be faked by users)
    const role = data.user.app_metadata?.role;
    if (role !== 'admin') {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
    };
  } catch {
    return null;
  }
}
