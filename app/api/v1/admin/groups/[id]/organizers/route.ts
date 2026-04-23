import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin-auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// POST /api/v1/admin/groups/[id]/organizers — assign organizer to group
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const { id: groupId } = await params;

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id } = body;
  if (!user_id) {
    return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
  }

  const adminId = await getCurrentUserId();

  try {
    const supabase = createSupabaseAdmin();

    // Verify user has organizer role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (profile.role !== 'organizer') {
      return NextResponse.json(
        { success: false, error: 'User must have organizer role first. Update their role in User Management.' },
        { status: 400 }
      );
    }

    // Fetch or create promoters row
    let promoterId: string;

    const { data: existingPromoter, error: promoterFetchError } = await supabase
      .from('promoters')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (promoterFetchError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch promoter record' }, { status: 500 });
    }

    if (existingPromoter) {
      promoterId = existingPromoter.id;
    } else {
      const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;

      const { data: newPromoter, error: createError } = await supabase
        .from('promoters')
        .insert({
          user_id,
          display_name: displayName,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newPromoter) {
        return NextResponse.json({ success: false, error: 'Failed to create promoter record' }, { status: 500 });
      }

      promoterId = newPromoter.id;
    }

    // Check for duplicate assignment
    const { data: existing, error: dupError } = await supabase
      .from('group_organizers')
      .select('id')
      .eq('group_id', groupId)
      .eq('promoter_id', promoterId)
      .maybeSingle();

    if (dupError) {
      return NextResponse.json({ success: false, error: 'Failed to check existing assignment' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ success: false, error: 'This organizer is already assigned to the group' }, { status: 409 });
    }

    // Insert assignment
    const { data: newAssignment, error: insertError } = await supabase
      .from('group_organizers')
      .insert({
        group_id: groupId,
        promoter_id: promoterId,
        assigned_by: adminId,
        assigned_at: new Date().toISOString(),
      })
      .select('id, group_id, promoter_id, assigned_by, assigned_at')
      .single();

    if (insertError || !newAssignment) {
      return NextResponse.json({ success: false, error: 'Failed to assign organizer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newAssignment });
  } catch (err) {
    console.error('Admin groups POST organizer error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/groups/[id]/organizers — remove organizer from group
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const { id: groupId } = await params;

  let body: { assignment_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { assignment_id } = body;
  if (!assignment_id) {
    return NextResponse.json({ success: false, error: 'assignment_id is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdmin();

    const { error: deleteError } = await supabase
      .from('group_organizers')
      .delete()
      .eq('id', assignment_id)
      .eq('group_id', groupId);

    if (deleteError) {
      return NextResponse.json({ success: false, error: 'Failed to remove organizer' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin groups DELETE organizer error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
