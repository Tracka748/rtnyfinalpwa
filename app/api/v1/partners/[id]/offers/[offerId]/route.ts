import { NextRequest, NextResponse } from 'next/server'
import {
  UUID_RE,
  authorizePartner,
  checkGuestRange,
  dbErrorResponse,
  missingForSubmit,
  parseOfferFields,
  parseReviewNote,
  readJsonObject,
  type OfferStatus,
  type OfferUpdate,
} from '../_shared'

type RouteParams = { params: Promise<{ id: string; offerId: string }> }

const ACTIONS = ['save', 'submit', 'approve', 'request_changes', 'deactivate'] as const
type Action = (typeof ACTIONS)[number]

const EDITABLE_STATUSES: OfferStatus[] = ['draft', 'needs_changes']

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, offerId } = await params
    const access = await authorizePartner(id)
    if (access instanceof NextResponse) return access

    if (!UUID_RE.test(offerId)) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const body = await readJsonObject(request)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { action: rawAction = 'save', review_note: rawReviewNote, ...fields } = body
    if (typeof rawAction !== 'string' || !(ACTIONS as readonly string[]).includes(rawAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    const action = rawAction as Action

    if ((action === 'approve' || action === 'request_changes') && !access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (rawReviewNote !== undefined && action !== 'request_changes') {
      return NextResponse.json(
        { error: 'review_note is only accepted with request_changes' },
        { status: 400 }
      )
    }

    const hasFields = Object.keys(fields).length > 0
    if (hasFields && action !== 'save' && action !== 'submit') {
      return NextResponse.json(
        { error: `Field edits are not allowed with action ${action}` },
        { status: 400 }
      )
    }
    if (action === 'save' && !hasFields) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const parsed = parseOfferFields(fields, { partnerId: id, offerId })
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { data: offer, error: fetchError } = await access.supabase
      .from('vendor_services')
      .select('*')
      .eq('id', offerId)
      .eq('partner_id', id)
      .is('vendor_id', null)
      .maybeSingle()

    if (fetchError) {
      return dbErrorResponse('partners/[id]/offers/[offerId] fetch error', fetchError, 'Failed to update offer')
    }
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const merged = { ...offer, ...parsed.values }
    const guestError = checkGuestRange(merged.min_guests, merged.max_guests)
    if (guestError) {
      return NextResponse.json({ error: guestError }, { status: 400 })
    }

    const current = offer.status as OfferStatus
    const updates: OfferUpdate = { ...parsed.values }
    const invalidTransition = () =>
      NextResponse.json({ error: `Cannot ${action} an offer with status ${current}` }, { status: 409 })

    switch (action) {
      case 'save':
        if (EDITABLE_STATUSES.includes(current)) {
          updates.status = current
          updates.active = false
        } else if (!access.isAdmin) {
          // Owner edits to live or in-review offers go back through review.
          updates.status = 'pending'
          updates.active = false
        }
        // Admin edits to pending/active offers keep their status and visibility.
        break

      case 'submit': {
        if (!EDITABLE_STATUSES.includes(current)) return invalidTransition()
        const missing = missingForSubmit(merged)
        if (missing.length > 0) {
          return NextResponse.json(
            { error: `Missing required fields: ${missing.join(', ')}` },
            { status: 400 }
          )
        }
        updates.status = 'pending'
        updates.active = false
        break
      }

      case 'approve':
        if (current !== 'pending') return invalidTransition()
        updates.status = 'active'
        updates.active = true
        break

      case 'request_changes': {
        if (current !== 'pending') return invalidTransition()
        const note = parseReviewNote(rawReviewNote)
        if ('error' in note) {
          return NextResponse.json({ error: note.error }, { status: 400 })
        }
        updates.status = 'needs_changes'
        updates.active = false
        updates.review_note = note.value
        break
      }

      case 'deactivate':
        if (current !== 'active') return invalidTransition()
        updates.status = 'draft'
        updates.active = false
        break
    }

    updates.category = access.category ?? offer.category
    updates.updated_at = new Date().toISOString()

    // Guard on the status we read so a concurrent transition can't be overwritten.
    const { data: updatedOffer, error } = await access.supabase
      .from('vendor_services')
      .update(updates)
      .eq('id', offerId)
      .eq('partner_id', id)
      .is('vendor_id', null)
      .eq('status', current)
      .select('*')
      .maybeSingle()

    if (error) {
      return dbErrorResponse('partners/[id]/offers/[offerId] PATCH error', error, 'Failed to update offer')
    }
    if (!updatedOffer) {
      return NextResponse.json(
        { error: 'Offer was changed by someone else; reload and try again' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, data: updatedOffer })
  } catch (err) {
    console.error('partners/[id]/offers/[offerId] PATCH route error:', err)
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, offerId } = await params
    const access = await authorizePartner(id)
    if (access instanceof NextResponse) return access

    if (!UUID_RE.test(offerId)) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const { data: offer, error: fetchError } = await access.supabase
      .from('vendor_services')
      .select('id, status')
      .eq('id', offerId)
      .eq('partner_id', id)
      .is('vendor_id', null)
      .maybeSingle()

    if (fetchError) {
      return dbErrorResponse('partners/[id]/offers/[offerId] fetch error', fetchError, 'Failed to delete offer')
    }
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }
    if (!EDITABLE_STATUSES.includes(offer.status as OfferStatus)) {
      return NextResponse.json(
        { error: 'Only draft or needs_changes offers can be deleted' },
        { status: 409 }
      )
    }

    const { data: deleted, error } = await access.supabase
      .from('vendor_services')
      .delete()
      .eq('id', offerId)
      .eq('partner_id', id)
      .is('vendor_id', null)
      .in('status', EDITABLE_STATUSES)
      .select('id')

    if (error) {
      return dbErrorResponse('partners/[id]/offers/[offerId] DELETE error', error, 'Failed to delete offer')
    }
    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { error: 'Offer was changed by someone else; reload and try again' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('partners/[id]/offers/[offerId] DELETE route error:', err)
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 })
  }
}
