// app/api/v1/promoter/events/draft/[id]/route.ts
// PATCH and DELETE endpoints for draft events

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/promoter/events/draft/[id]
 * Fetch a single draft by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: draft, error } = await supabase
      .from('event_drafts')
      .select('*, venues(name, address)')
      .eq('id', id)
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.promoter_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Normalize venue_name from joined venues table
    draft.venue_name = draft.venue_name || draft.venues?.name || null;

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error in GET /api/v1/promoter/events/draft/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/promoter/events/draft/[id]
 * Update a draft (e.g. submit for review)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify draft exists and belongs to user
    const { data: existingDraft, error: fetchError } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (existingDraft.promoter_id !== user.id) {
      return NextResponse.json({ error: 'You can only modify your own drafts' }, { status: 403 });
    }

    const body = await request.json();

    // Handle submit for review
    if (body.submit_for_review) {
      if (existingDraft.status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot submit: draft is already "${existingDraft.status}"` },
          { status: 400 }
        );
      }

      // Validate required fields on the existing draft
      const missing: string[] = [];
      if (!existingDraft.name) missing.push('name');
      if (!existingDraft.category) missing.push('category');
      if (!existingDraft.event_date) missing.push('event_date');
      if (!existingDraft.venue_id && !existingDraft.venue_name) missing.push('venue');
      if (!existingDraft.ticket_prices || Object.keys(existingDraft.ticket_prices).length === 0) missing.push('ticket_prices');

      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Cannot submit: missing ${missing.join(', ')}. Please edit the draft first.` },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('event_drafts')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft status:', error);
        return NextResponse.json({ error: 'Failed to submit draft' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: 'Draft submitted for review',
      });
    }

    // Generic field updates (for future use)
    const allowedFields = ['name', 'description', 'category', 'event_date', 'venue_id', 'venue_name', 'ticket_prices', 'flyer_image_url', 'tier_discounts'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('event_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating draft:', error);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Draft updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/v1/promoter/events/draft/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/promoter/events/draft/[id]
 * Delete a draft event (only if status is 'draft')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('DELETE draft request for id:', id);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('DELETE auth check:', { userId: user?.id, authError: authError?.message });

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existingDraft, error: fetchError } = await supabase
      .from('event_drafts')
      .select('id, status, promoter_id')
      .eq('id', id)
      .single();

    console.log('DELETE draft lookup:', { found: !!existingDraft, status: existingDraft?.status, fetchError: fetchError?.message });

    if (fetchError || !existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (existingDraft.promoter_id !== user.id) {
      console.error('DELETE ownership mismatch:', { draftOwner: existingDraft.promoter_id, requestUser: user.id });
      return NextResponse.json({ error: 'You can only delete your own drafts' }, { status: 403 });
    }

    if (existingDraft.status !== 'draft') {
      console.log('DELETE blocked - status is:', existingDraft.status);
      return NextResponse.json(
        { error: `Cannot delete: status is "${existingDraft.status}". Only drafts can be deleted.` },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('event_drafts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('DELETE database error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete draft', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('DELETE successful for draft:', id);
    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });

  } catch (error) {
    console.error('DELETE endpoint crash:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}