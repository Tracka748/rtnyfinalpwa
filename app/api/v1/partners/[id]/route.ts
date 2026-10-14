import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

// Columns safe to show on the public partner page. Internal fields (owner_id,
// business_id, venue_id, vendor_id, active, moderation flags, timestamps,
// supporter_count) are never returned by GET.
const PUBLIC_PARTNER_COLUMNS =
  'id, display_name, tagline, bio, partner_type, category, category_id, logo_url, cover_image_url, ' +
  'website_url, contact_email, contact_phone, verified, visible_modules'

const OWNER_ALLOWED_FIELDS = [
  'display_name', 'tagline', 'bio', 'category', 'category_id', 'contact_email',
  'contact_phone', 'website_url', 'logo_url', 'cover_image_url', 'visible_modules',
] as const

const ADMIN_ONLY_FIELDS = [
  'active', 'verified', 'partner_type', 'venue_id', 'vendor_id', 'owner_id',
  'requires_photo_verified_tags',
] as const

const MODULE_KEYS = new Set([
  'about', 'upcoming_events', 'gallery', 'rewards_offers', 'plan_your_event',
  'activity_feed', 'experiences',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Digits, spaces, + - ( ) . x, and the word "ext" (e.g. "585-555-1234 ext 2").
const PHONE_RE = /^(?:ext|[0-9 +\-().x])+$/i

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Public URL written by PartnerImageUpload: {base}/storage/v1/object/public/
// {bucket}/{partnerId}/{logo|cover}.{ext}?v={timestamp}
function storageImagePattern(bucket: string, partnerId: string, filename: string): RegExp {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  return new RegExp(
    `^${escapeRegExp(base)}/storage/v1/object/public/${bucket}/${escapeRegExp(partnerId)}/` +
      `${filename}\\.(jpg|jpeg|png|webp|gif)(\\?v=\\d+)?$`,
    'i'
  )
}

function isOptionalString(value: unknown, max: number): boolean {
  return value === null || (typeof value === 'string' && value.length <= max)
}

function isBlank(value: unknown): boolean {
  return value === null || value === ''
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Returns a short field-specific message, or null when the value is valid.
function validateField(
  field: string,
  value: unknown,
  ctx: { partnerId: string; restrictImages: boolean; current: Record<string, unknown> | null }
): string | null {
  switch (field) {
    case 'display_name':
      return typeof value === 'string' && value.trim().length > 0 && value.length <= 120
        ? null
        : 'display_name must be a non-empty string of at most 120 characters'
    case 'tagline':
      return isOptionalString(value, 200) ? null : 'tagline must be a string of at most 200 characters'
    case 'bio':
      return isOptionalString(value, 5000) ? null : 'bio must be a string of at most 5000 characters'
    case 'category':
      return isOptionalString(value, 80) ? null : 'category must be a string of at most 80 characters'
    // Contact fields: type and length are always checked; the format rule only
    // applies when the value changes, so older stored values don't block saves.
    case 'contact_email':
      if (!isOptionalString(value, 254)) return 'contact_email must be a string of at most 254 characters'
      return isBlank(value) || value === ctx.current?.[field] || EMAIL_RE.test(value as string)
        ? null
        : 'contact_email must be a valid email address'
    case 'contact_phone':
      if (!isOptionalString(value, 32)) return 'contact_phone must be a string of at most 32 characters'
      return isBlank(value) || value === ctx.current?.[field] || PHONE_RE.test(value as string)
        ? null
        : 'contact_phone may only contain digits, spaces, + - ( ) . x and "ext"'
    case 'website_url':
      if (!isOptionalString(value, 2048)) return 'website_url must be a string of at most 2048 characters'
      return isBlank(value) || value === ctx.current?.[field] || isHttpUrl(value as string)
        ? null
        : 'website_url must be an http or https URL'
    case 'visible_modules':
      return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.entries(value as Record<string, unknown>).every(
          ([key, enabled]) => MODULE_KEYS.has(key) && typeof enabled === 'boolean'
        )
        ? null
        : 'visible_modules must map known section names to true or false'
    case 'logo_url':
    case 'cover_image_url': {
      // Owners may only point at their own uploads; unchanged values (including
      // older URLs already stored) are left alone. Admins are unrestricted.
      if (!ctx.restrictImages || value === ctx.current?.[field]) return null
      if (value === null) return null
      const [bucket, filename] = field === 'logo_url' ? ['partner-logos', 'logo'] : ['partner-covers', 'cover']
      return typeof value === 'string' && storageImagePattern(bucket, ctx.partnerId, filename).test(value)
        ? null
        : `${field} must be an image uploaded for this partner`
    }
    case 'owner_id':
      return value === null || (typeof value === 'string' && UUID_RE.test(value))
        ? null
        : 'owner_id must be null or a valid id'
    default:
      return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    // venue_id is read only to look up the venue and its events server-side;
    // it is removed before the partner is returned.
    const { data: partnerRow, error: partnerError } = await supabase
      .from('partners')
      .select(`${PUBLIC_PARTNER_COLUMNS}, venue_id, partner_categories(name)`)
      .eq('id', id)
      .eq('active', true)
      .single()

    if (partnerError || !partnerRow) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const { venue_id: venueId, ...partner } = partnerRow

    const [venueResult, mediaResult, supporterResult] = await Promise.all([
      venueId
        ? supabase.from('venues').select('name, address').eq('id', venueId).single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('partner_media')
        .select('id, url')
        .eq('partner_id', id)
        .or('photo_review_status.is.null,photo_review_status.eq.approved')
        .order('sort_order', { ascending: true }),
      supabase
        .from('partner_supporters')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', id),
    ])

    if (venueResult.error) console.error('venues fetch error:', venueResult.error)
    if (mediaResult.error) console.error('partner_media fetch error:', mediaResult.error)
    if (supporterResult.error) console.error('partner_supporters fetch error:', supporterResult.error)

    let upcoming_events: unknown[] = []
    const modules = partner.visible_modules as Record<string, boolean> | null
    if (modules?.upcoming_events && venueId) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, event_date, category, flyer_image_url, description, ticket_types (price)')
        .eq('venue_id', venueId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(6)

      if (eventsError) {
        console.error('events fetch error:', eventsError)
      } else {
        upcoming_events = events ?? []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        partner,
        venue: venueResult.data ?? null,
        media: mediaResult.data ?? [],
        supporter_count: supporterResult.count ?? 0,
        upcoming_events,
      },
    })
  } catch (err) {
    console.error('partners/[id] route error:', err)
    return NextResponse.json({ error: 'Failed to fetch partner' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const supabaseServer = await createSupabaseServer()

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [profileResult, partnerResult] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('partners').select('owner_id, logo_url, cover_image_url, contact_email, contact_phone, website_url').eq('id', id).single(),
    ])

    const isAdmin = profileResult.data?.role === 'admin'
    const isOwner = partnerResult.data?.owner_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      body = parsed
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (isAdmin) {
      if (typeof body.active === 'boolean') updates.active = body.active
      if (typeof body.verified === 'boolean') updates.verified = body.verified
      if (body.partner_type !== undefined) updates.partner_type = body.partner_type
      if (body.venue_id !== undefined) updates.venue_id = body.venue_id
      if (body.vendor_id !== undefined) updates.vendor_id = body.vendor_id
      if (body.owner_id !== undefined) updates.owner_id = body.owner_id
      if (typeof body.requires_photo_verified_tags === 'boolean') updates.requires_photo_verified_tags = body.requires_photo_verified_tags
    }

    for (const field of OWNER_ALLOWED_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const ctx = {
      partnerId: id,
      restrictImages: !isAdmin,
      current: (partnerResult.data as Record<string, unknown> | null) ?? null,
    }
    for (const field of [...OWNER_ALLOWED_FIELDS, ...ADMIN_ONLY_FIELDS]) {
      if (!(field in updates)) continue
      const message = validateField(field, updates[field], ctx)
      if (message) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }

    const { data: updatedPartner, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('partners/[id] PATCH update error:', error)
      return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedPartner })
  } catch (err) {
    console.error('partners/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const supabaseServer = await createSupabaseServer()

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('partners/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
  }
}
