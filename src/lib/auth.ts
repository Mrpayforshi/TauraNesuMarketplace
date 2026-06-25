import { createServerClient } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extracts the authenticated user from the request.
 * Reads the Authorization: Bearer <token> header and validates with Supabase Auth.
 * Returns null if unauthenticated or token is invalid.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice(7);
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return {
      id: data.user.id,
      email: data.user.email!,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Returns a 401 JSON response.
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}
