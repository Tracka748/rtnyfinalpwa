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

const ALLOWED_STATUSES = ['active', 'cancelled', 'sold_out', 'postponed'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      event_date,
      venue_id,         // null when custom_address is used
      custom_address,
      category,
      status,
      total_tickets,
      flyer_image_url,
      featured,
      // TODO: target_neighborhoods does not exist on the events table (lives on invite_runs)
      // target_neighborhoods,
      // TODO: target_vibes does not exist on the events table (lives on invite_runs)
      // target_vibes,
      // TODO: target_age_ranges does not exist on the events table (lives on invite_runs)
      // target_age_ranges,
    } = body;

    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`, success: false },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (event_date !== undefined) updatePayload.event_date = event_date;
    if (venue_id !== undefined) updatePayload.venue_id = venue_id ?? null;
    if (custom_address !== undefined) updatePayload.custom_address = custom_address ?? null;

    console.log('[events/update] payload venue_id:', updatePayload.venue_id, '| custom_address:', updatePayload.custom_address);
    if (category !== undefined) updatePayload.category = category;
    if (status !== undefined) updatePayload.status = status;
    if (total_tickets !== undefined) updatePayload.total_tickets = Number(total_tickets);
    if (flyer_image_url !== undefined) updatePayload.flyer_image_url = flyer_image_url;
    if (featured !== undefined) updatePayload.featured = featured;

    const supabase = getSupabaseAdmin();

    const { data: event, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('=== Event update DB error ===');
      console.error(JSON.stringify(error, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to update event',
          details: error,
          code: error?.code,
          message: error?.message,
          success: false,
        },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { event } });
  } catch (error) {
    console.error('=== Event update unexpected error ===');
    console.error(JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Internal server error', details: error, success: false },
      { status: 500 }
    );
  }
}
