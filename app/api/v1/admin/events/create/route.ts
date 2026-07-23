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

export async function POST(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const body = await request.json();

    const {
      name,
      description,
      event_date,       // combined ISO datetime string from the form
      venue_id,
      custom_address,
      category,
      total_tickets,
      ticket_price,     // single number — stored as ticket_prices JSON
      flyer_image_url,
      status = 'active',
      promoter_id,
    } = body;

    if (!name || !event_date || !category) {
      return NextResponse.json(
        { error: 'name, event_date, and category are required', success: false },
        { status: 400 }
      );
    }

    if (!venue_id && !custom_address) {
      return NextResponse.json(
        { error: 'Please select a venue or enter a custom address', success: false },
        { status: 400 }
      );
    }

    const ALLOWED_STATUSES = ['active', 'cancelled', 'sold_out', 'postponed'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`, success: false },
        { status: 400 }
      );
    }

    // sale dates default to the event date
    const saleStartDate = event_date.split('T')[0];
    const saleEndDate = event_date.split('T')[0];

    // ticket_prices stored as JSON object { general: price }
    const ticketPricesJson = ticket_price ? { general: Number(ticket_price) } : { general: 0 };

    const supabase = getSupabaseAdmin();

    const insertPayload: Record<string, unknown> = {
      name,
      description: description ?? '',
      event_date,
      category,
      total_tickets: total_tickets ? Number(total_tickets) : 0,
      ticket_prices: ticketPricesJson,
      sale_start_date: saleStartDate,
      sale_end_date: saleEndDate,
      flyer_image_url: flyer_image_url ?? null,
      status,
      tickets_sold: 0,
      featured: false,
    };

    insertPayload.venue_id = venue_id || null;
    insertPayload.custom_address = custom_address || null;
    if (promoter_id) insertPayload.promoter_id = promoter_id;

    console.log('[events/create] payload venue_id:', insertPayload.venue_id, '| custom_address:', insertPayload.custom_address);

    const { data, error } = await supabase
      .from('events')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      console.error('=== Event create DB error ===');
      console.error(JSON.stringify(error, null, 2));
      console.error('Insert payload was:', JSON.stringify(insertPayload, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to create event',
          details: error,
          code: error?.code,
          message: error?.message,
          success: false,
        },
        { status: 500 }
      );
    }

    // Mirror the ticket_types insert done in event-drafts/[id]/approve so
    // admin-created events also get purchasable inventory, not just the
    // deprecated ticket_prices JSON.
    const ticketTypeQuantity = total_tickets ? Number(total_tickets) : 0;
    const { error: ticketTypesError } = await supabase
      .from('ticket_types')
      .insert({
        event_id: data.id,
        name: 'General',
        price: ticketPricesJson.general,
        quantity: ticketTypeQuantity,
        remaining: ticketTypeQuantity,
        description: null,
      });

    if (ticketTypesError) {
      console.error('Failed to create ticket types, rolling back created event:', ticketTypesError);
      const { error: rollbackError } = await supabase
        .from('events')
        .delete()
        .eq('id', data.id);

      if (rollbackError) {
        console.error('Failed to roll back created event after ticket_types failure:', rollbackError);
      }

      return NextResponse.json(
        { error: 'Failed to create ticket types', details: ticketTypesError.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { event_id: data.id },
    });
  } catch (error) {
    console.error('=== Event create unexpected error ===');
    console.error(JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Internal server error', details: error, success: false },
      { status: 500 }
    );
  }
}
