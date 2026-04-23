import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (typeof body.active !== 'boolean') {
      return NextResponse.json(
        { error: 'active must be a boolean' },
        { status: 400 }
      );
    }

    // Verify ownership via created_by before updating
    const { data: existing, error: fetchError } = await supabase
      .from('promo_codes')
      .select('id, created_by')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update({ active: body.active })
      .eq('id', id)
      .select('id, code, discount_type, discount_value, usage_limit, usage_count, valid_from, valid_until, active, created_at')
      .single();

    if (error) {
      console.error('[promoter/promo-codes/[id]] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[promoter/promo-codes/[id]] PATCH unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
