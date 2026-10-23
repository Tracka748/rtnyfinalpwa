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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/v1/admin/users/search?q={query}&limit={n}
// GET /api/v1/admin/users/search?id={uuid}
// Search profiles by email, first name, or last name, or look up one profile by id.
// Search returns up to `limit` results (default 8, max 20).
export async function GET(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id !== null) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid id', success: false }, { status: 400 });
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', id)
        .limit(1);

      if (error) {
        console.error('User lookup error:', error);
        return NextResponse.json(
          { error: 'Search failed', success: false },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: { users: data ?? [] } });
    } catch (error) {
      console.error('User lookup unexpected error:', error);
      return NextResponse.json(
        { error: 'Internal server error', success: false },
        { status: 500 }
      );
    }
  }

  // Strip characters that have meaning in a PostgREST .or() filter string
  // (clause separators, grouping, wildcards, escapes) so the term stays a plain value.
  const q = (searchParams.get('q') ?? '').replace(/[,()%*\\]/g, '').trim();
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '8') || 8, 1), 20);

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
