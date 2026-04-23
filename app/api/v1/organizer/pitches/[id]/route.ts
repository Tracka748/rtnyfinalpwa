import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const VALID_STATUSES = ['active', 'closed', 'converted'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdmin();
    const { id } = await params;

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // 1. Get promoter row
    const { data: promoter } = await db
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!promoter) {
      return NextResponse.json({ error: 'No promoter profile found' }, { status: 403 });
    }

    // 2. Get group_ids this organizer manages
    const { data: orgRows } = await db
      .from('group_organizers')
      .select('group_id')
      .eq('promoter_id', promoter.id);

    const groupIds = (orgRows ?? []).map((r) => r.group_id);

    // 3. Fetch the pitch and verify it belongs to one of their groups
    const { data: pitch, error: fetchError } = await db
      .from('event_pitches')
      .select('id, group_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    if (!groupIds.includes(pitch.group_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Update status
    const { data: updated, error: updateError } = await db
      .from('event_pitches')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, group_id, organizer_id, title, description, category, date_start, date_end, price_min, price_max, preferred_locations, ideas_details, interest_count, status, created_at, updated_at'
      )
      .single();

    if (updateError) {
      console.error('[organizer/pitches/patch] update error:', updateError);
      return NextResponse.json({ error: 'Failed to update pitch' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[organizer/pitches/patch] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
