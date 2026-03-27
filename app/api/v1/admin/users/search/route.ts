import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/v1/admin/users/search?q={query}&limit={n}
// Search profiles by email, first name, or last name.
// Returns up to `limit` results (default 8, max 20).
export async function GET(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '8'), 20);

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: { users: [] } });
  }

  try {
    const supabase = getSupabaseAdmin();
    const term = `%${q}%`;

    // Search by email OR first_name OR last_name
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
      .limit(limit);

    if (error) {
      console.error('User search error:', error);
      return NextResponse.json(
        { error: 'Search failed', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { users: data ?? [] } });
  } catch (error) {
    console.error('User search unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
