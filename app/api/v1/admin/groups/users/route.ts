import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const supabase = createSupabaseAdmin();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'organizer');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch organizer profiles' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() ?? '';

    const data = search
      ? (profiles ?? []).filter((p) => {
          return (
            p.first_name?.toLowerCase().includes(search) ||
            p.last_name?.toLowerCase().includes(search) ||
            p.email?.toLowerCase().includes(search)
          );
        })
      : (profiles ?? []);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Admin groups users GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
