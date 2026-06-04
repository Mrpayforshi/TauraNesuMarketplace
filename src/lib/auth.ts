import { createServerSupabaseClient } from './supabase';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  try {
    // Read the Authorization header
    const authHeader = request.headers.get('authorization');
    
    // Check if header exists and has the correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract the token string after "Bearer "
    const token = authHeader.slice(7);

    // Create Supabase client and verify the token
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    // If there is an error or no user returned, return null
    if (error || !data.user) {
      return null;
    }

    // Return the user object with the expected shape
    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    };
  } catch (error) {
    return null;
  }
}
