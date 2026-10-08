import { NextRequest, NextResponse } from 'next/server'
import {
  authorizePartner,
  checkGuestRange,
  dbErrorResponse,
  parseOfferFields,
  readJsonObject,
  resolvePricing,
  type OfferInsert,
} from './_shared'

// Partner-owned offers: vendor_services rows with partner_id set and vendor_id NULL.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await authorizePartner(id)
    if (access instanceof NextResponse) return access

    const { data: offers, error } = await access.supabase
      .from('vendor_services')
      .select('*')
      .eq('partner_id', id)
      .is('vendor_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      return dbErrorResponse('partners/[id]/offers GET error', error, 'Failed to fetch offers')
    }

    return NextResponse.json({ success: true, data: offers ?? [] })
  } catch (err) {
    console.error('partners/[id]/offers GET route error:', err)
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await authorizePartner(id)
    if (access instanceof NextResponse) return access

    const body = await readJsonObject(request)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = parseOfferFields(body, { partnerId: id, offerId: null })
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const pricingError = resolvePricing(parsed.values, null)
    if (pricingError) {
      return NextResponse.json({ error: pricingError }, { status: 400 })
    }

    // price is NOT NULL; drafts without a pricing model yet store 0.
    const { title, price = 0, ...rest } = parsed.values
    if (typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const guestError = checkGuestRange(rest.min_guests, rest.max_guests)
    if (guestError) {
      return NextResponse.json({ error: guestError }, { status: 400 })
    }

    // vendor_services.category is NOT NULL; it comes from the partner's category.
    if (!access.category) {
      return NextResponse.json(
        { error: 'Partner has no category; set one before adding offers' },
        { status: 400 }
      )
    }

    const insert: OfferInsert = {
      ...rest,
      title,
      price,
      partner_id: id,
      vendor_id: null,
      category: access.category,
      occasions: ['birthday'],
      status: 'draft',
      active: false,
      review_note: null,
      updated_at: new Date().toISOString(),
    }

    const { data: offer, error } = await access.supabase
      .from('vendor_services')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      return dbErrorResponse('partners/[id]/offers POST error', error, 'Failed to create offer')
    }

    return NextResponse.json({ success: true, data: offer }, { status: 201 })
  } catch (err) {
    console.error('partners/[id]/offers POST route error:', err)
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
  }
}
