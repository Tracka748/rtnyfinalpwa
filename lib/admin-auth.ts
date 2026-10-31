/*
 * Required database migration — run once in Supabase SQL editor before deploying:
 *
 *   ALTER TABLE public.profiles
 *   ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
 *   CHECK (role IN ('user', 'admin', 'promoter'));
 *
 *   -- Find your user ID:
 *   SELECT id FROM auth.users WHERE email = 'tracka748@gmail.com';
 *   -- Then grant admin:
 *   UPDATE public.profiles SET role = 'admin' WHERE id = '<your-uuid>';
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

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

// Legacy email whitelist — kept for reference only, no longer used in auth logic.
// const ADMIN_EMAILS = ['admin@rtny.com', 'tracka748@gmail.com'];

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return {
      error: true,
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return { error: false, response: null };
}

/**
 * Used in API routes that admins and promoters/organizers may call (ticket scanning).
 * Allowed set matches app/promoter/layout.tsx. Callers must still verify event
 * ownership for non-admins (isAdmin === false).
 */
export async function checkCanScan(): Promise<
  | { error: false; response: null; user: User; isAdmin: boolean }
  | { error: true; response: NextResponse; user: null; isAdmin: false }
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
      user: null,
      isAdmin: false,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_organizer')
    .eq('id', user.id)
    .single();

  const isAdmin = !profileError && profile?.role === 'admin';
  const canScan =
    isAdmin ||
    (!profileError &&
      (profile?.role === 'promoter' ||
        profile?.role === 'organizer' ||
        profile?.is_organizer === true));

  if (!canScan) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Scanner access required' }, { status: 403 }),
      user: null,
      isAdmin: false,
    };
  }

  return { error: false, response: null, user, isAdmin };
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminStatus = profile?.role === 'admin';

  return {
    isAdmin: adminStatus,
    user,
    error: adminStatus ? null : 'Not authorized - admin access required',
  };
}
