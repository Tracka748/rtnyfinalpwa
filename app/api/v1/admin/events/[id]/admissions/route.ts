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

// GET /api/v1/admin/events/[id]/admissions
// Returns all ticket_types for the event
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: ticket_types, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Admissions GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ticket types', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { ticket_types: ticket_types ?? [] } });
  } catch (error) {
    console.error('Admissions GET unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/events/[id]/admissions
// Create a new ticket_type for this event
// Body: { name, price, quantity, description? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, quantity, description } = body;

    if (!name || price === undefined || quantity === undefined) {
      return NextResponse.json(
        { error: 'name, price, and quantity are required', success: false },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: ticket_type, error } = await supabase
      .from('ticket_types')
      .insert({
        event_id: id,
        name,
        price: Number(price),
        quantity: Number(quantity),
        remaining: Number(quantity), // remaining starts equal to quantity on creation
        description: description ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Admissions POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket type', details: error, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { ticket_type } }, { status: 201 });
  } catch (error) {
    console.error('Admissions POST unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/admin/events/[id]/admissions
// Update a ticket_type by ticket_type id
// Body: { ticket_type_id, name?, price?, quantity?, remaining?, description? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { ticket_type_id, name, price, quantity, remaining, description } = body;

    if (!ticket_type_id) {
      return NextResponse.json(
        { error: 'ticket_type_id is required', success: false },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (price !== undefined) updatePayload.price = Number(price);
    if (quantity !== undefined) updatePayload.quantity = Number(quantity);
    if (remaining !== undefined) updatePayload.remaining = Number(remaining);
    if (description !== undefined) updatePayload.description = description;

    const supabase = getSupabaseAdmin();

    const { data: ticket_type, error } = await supabase
      .from('ticket_types')
      .update(updatePayload)
      .eq('id', ticket_type_id)
      .eq('event_id', id) // ensure the ticket_type belongs to this event
      .select('*')
      .single();

    if (error) {
      console.error('Admissions PATCH error:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket type', details: error, success: false },
        { status: 500 }
      );
    }

    if (!ticket_type) {
      return NextResponse.json(
        { error: 'Ticket type not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { ticket_type } });
  } catch (error) {
    console.error('Admissions PATCH unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/events/[id]/admissions
// Delete a ticket_type by ticket_type id
// Body: { ticket_type_id }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { ticket_type_id } = body;

    if (!ticket_type_id) {
      return NextResponse.json(
        { error: 'ticket_type_id is required', success: false },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', ticket_type_id)
      .eq('event_id', id); // ensure the ticket_type belongs to this event

    if (error) {
      console.error('Admissions DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete ticket type', details: error, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { ticket_type_id } });
  } catch (error) {
    console.error('Admissions DELETE unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
