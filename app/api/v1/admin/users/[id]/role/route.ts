import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkIsAdmin } from '@/lib/admin-auth';

const VALID_ROLES = ['user', 'promoter', 'organizer', 'admin'] as const;
type Role = (typeof VALID_ROLES)[number];

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// PATCH /api/v1/admin/users/[id]/role — body: { role }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const { id: targetId } = await params;
  const currentUserId = await getCurrentUserId();

  if (currentUserId && currentUserId === targetId) {
    return NextResponse.json(
      { success: false, error: 'Cannot change your own role' },
      { status: 400 }
    );
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role } = body;
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json(
      { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Auto-create promoters row for organizer and promoter roles
    if (role === 'organizer' || role === 'promoter') {
      const { data: existingPromoter } = await supabase
        .from('promoters')
        .select('id')
        .eq('user_id', targetId)
        .maybeSingle();

      if (!existingPromoter) {
        const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email || 'Unknown';
        await supabase
          .from('promoters')
          .insert({
            user_id: targetId,
            display_name: displayName,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Role update error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
