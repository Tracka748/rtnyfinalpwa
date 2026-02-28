import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Create Supabase client for server components
 */
async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Check if user is an admin
 * Development: Uses email whitelist
 * Production TODO: Query app_admins table
 */
export async function isAdmin(email?: string): Promise<boolean> {
  if (!email) return false;

  // Admin whitelist
  const adminEmails = [
    'admin@rtny.com',
    'tracka748@gmail.com',
  ];

  return adminEmails.includes(email.toLowerCase());
}

/**
 * Used in API routes to gate admin-only endpoints.
 * Returns { error: false } if admin, or { error: true, response } to return immediately.
 */
export async function checkIsAdmin(): Promise<
  { error: false; response: null } | { error: true; response: NextResponse }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const adminStatus = await isAdmin(user.email);

  if (!adminStatus) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return { error: false, response: null };
}

/**
 * Get current user's admin status
 */
export async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, user: null, error: 'Not authenticated' };
  }

  const adminStatus = await isAdmin(user.email);

  return {
    isAdmin: adminStatus,
    user,
    error: adminStatus ? null : 'Not authorized - admin access required',
  };
}
