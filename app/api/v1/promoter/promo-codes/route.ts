import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// promo_codes.created_by confirmed present — admin generate route sets created_by: user.id

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, usage_limit, usage_count, valid_from, valid_until, active, event_id, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[promoter/promo-codes] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('[promoter/promo-codes] GET unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, discount_type, discount_value, valid_from, valid_until, usage_limit } = body;

    // Validate discount_type
    if (!discount_type || !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json(
        { error: 'discount_type must be "percentage" or "fixed"' },
        { status: 400 }
      );
    }

    // Validate discount_value
    const numericValue = Number(discount_value);
    if (!discount_value || isNaN(numericValue) || numericValue <= 0) {
      return NextResponse.json(
        { error: 'discount_value must be a positive number' },
        { status: 400 }
      );
    }

    if (discount_type === 'percentage' && numericValue > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100' },
        { status: 400 }
      );
    }

    // Validate code: uppercase alphanumeric, hyphens allowed to match platform convention
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const normalised = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(normalised)) {
      return NextResponse.json(
        { error: 'code must be uppercase alphanumeric (hyphens allowed)' },
        { status: 400 }
      );
    }

    if (!valid_until) {
      return NextResponse.json({ error: 'valid_until is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: normalised,
        discount_type,
        discount_value: numericValue,
        valid_from: valid_from ?? new Date().toISOString(),
        valid_until,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        usage_count: 0,
        active: true,
        created_by: user.id,
      })
      .select('id, code, discount_type, discount_value, usage_limit, usage_count, valid_from, valid_until, active, created_at')
      .single();

    if (error) {
      console.error('[promoter/promo-codes] POST error:', error);
      // Surface unique constraint violation clearly
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Promo code "${normalised}" already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[promoter/promo-codes] POST unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
