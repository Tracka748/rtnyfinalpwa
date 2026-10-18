import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database'

type VendorRow = Database['public']['Tables']['vendors']['Row']
type VendorServiceRow = Database['public']['Tables']['vendor_services']['Row']
type VendorAvailabilityRow = Database['public']['Tables']['vendor_availability']['Row']
type VendorDynamicPricingRow = Database['public']['Tables']['vendor_dynamic_pricing']['Row']
type VendorBlackoutDateRow = Database['public']['Tables']['vendor_blackout_dates']['Row']
type PartnerRow = Database['public']['Tables']['partners']['Row']
type PartnerThemeTagRow = Database['public']['Tables']['partner_theme_tags']['Row']
type ThemeRow = Database['public']['Tables']['themes']['Row']

type PartnerThemeTagResult = Pick<PartnerThemeTagRow, 'status'> & {
  themes: Pick<ThemeRow, 'id' | 'name'> | null
}

// Only what the plan builder reads (approved theme tags); `active` is fetched to
// drop inactive partners and is stripped before the response.
type PartnerResult = Pick<PartnerRow, 'active'> & {
  partner_theme_tags: PartnerThemeTagResult[]
}

type PublicPartner = Omit<PartnerResult, 'active'>

// This route is unauthenticated and uses the service-role client, so every
// embed below selects an explicit column list. Never use select('*') here.
type VendorResult = Pick<
  VendorRow,
  | 'id' | 'name' | 'type' | 'tier' | 'rating' | 'review_count' | 'bio' | 'location'
  | 'profile_image_url' | 'instant_book' | 'available_days' | 'base_price' | 'price_unit'
> & {
  vendor_services: Pick<
    VendorServiceRow,
    'id' | 'title' | 'category' | 'price' | 'description' | 'duration_hours' | 'active'
  >[]
  // Server-side filtering only; stripped before the response.
  vendor_availability: Pick<VendorAvailabilityRow, 'start_time' | 'end_time' | 'booked'>[]
  vendor_dynamic_pricing: Pick<VendorDynamicPricingRow, 'day_of_week' | 'price_multiplier'>[]
  // Server-side filtering only; stripped before the response.
  vendor_blackout_dates: Pick<VendorBlackoutDateRow, 'date'>[]
  partners: PartnerResult | null
}

function toPublicPartner(partner: PartnerResult | null): PublicPartner | null {
  if (!partner || partner.active !== true) return null
  const { active: _active, ...rest } = partner
  return rest
}

// Maps UI filter pill values → DB vendors.type enum values
const TYPE_MAP: Record<string, string[]> = {
  'all':           [],
  'dj':            ['dj'],
  'photography':   ['photographer'],
  'videography':   ['addon'],
  'catering':      ['addon'],
  'lighting':      ['addon'],
  'decor':         ['addon'],
  'bartending':    ['bartender'],
  'security':      ['security'],
  'photo_booth':   ['addon'],
  'entertainment': ['addon'],
}

// Day-of-week label matching Postgres convention
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getEffectivePrice(
  basePrice: number,
  dynamicPricing: VendorResult['vendor_dynamic_pricing'],
  date: string
): number {
  const dayName = DAY_NAMES[new Date(date).getDay()]
  const rule = dynamicPricing.find(
    (r) => r.day_of_week?.toLowerCase() === dayName
  )
  return rule?.price_multiplier ? basePrice * rule.price_multiplier : basePrice
}

function isVendorAvailable(
  vendor: VendorResult,
  date: string,
  timeStart?: string,
  timeEnd?: string
): boolean {
  // Reject if date is a blackout date
  const isBlackedOut = vendor.vendor_blackout_dates.some((b) => b.date === date)
  if (isBlackedOut) return false

  // If no time filter, available as long as not blacked out
  if (!timeStart || !timeEnd) return true

  // No availability records = treat as available
  if (!vendor.vendor_availability || vendor.vendor_availability.length === 0) return true

  // Must have at least one unbooked availability slot that covers the requested window
  const hasSlot = vendor.vendor_availability.some((slot) => {
    if (slot.booked) return false
    return slot.start_time <= timeStart && slot.end_time >= timeEnd
  })

  return hasSlot
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const date = searchParams.get('date')
    const timeStart = searchParams.get('time_start') ?? undefined
    const timeEnd = searchParams.get('time_end') ?? undefined
    const maxPrice = searchParams.get('max_price')
      ? Number(searchParams.get('max_price'))
      : undefined

    const supabase = createSupabaseAdmin()

    const categoryKey = (category ?? 'all').toLowerCase()
    const dbTypes = TYPE_MAP[categoryKey] ?? []

    // Embedded filters (vendor_services.*, partner_theme_tags.status) prune the
    // embedded rows only; vendors are still returned with an empty array.
    let query = supabase
      .from('vendors')
      .select(`
        id, name, type, tier, rating, review_count, bio, location,
        profile_image_url, instant_book, available_days, base_price, price_unit,
        vendor_services (id, title, category, price, description, duration_hours, active),
        vendor_availability (start_time, end_time, booked),
        vendor_dynamic_pricing (day_of_week, price_multiplier),
        vendor_blackout_dates (date),
        partners (active, partner_theme_tags (status, themes (id, name)))
      `)
      .eq('active', true)
      .eq('vendor_services.active', true)
      .eq('vendor_services.status', 'active')
      .eq('partners.partner_theme_tags.status', 'approved')

    if (dbTypes.length > 0) {
      query = query.in('type', dbTypes) as typeof query
    }

    const { data: vendors, error } = await query
      .order('tier', { ascending: true })
      .order('rating', { ascending: false })
      .returns<VendorResult[]>()

    if (error) {
      console.error('Vendors query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vendors', details: 'Please try again later' },
        { status: 500 }
      )
    }

    let results: VendorResult[] = vendors ?? []

    // For addon-mapped categories, multiple UI filters share the same DB type.
    // Further narrow by vendor_services.category so e.g. 'catering' doesn't
    // return lighting or decor vendors.
    if (category && category !== 'all' && dbTypes[0] === 'addon') {
      results = results.filter((v) =>
        v.vendor_services.some(
          (s) => s.category.toLowerCase() === categoryKey && s.active !== false
        )
      )
    }

    // Filter by availability (date + optional time window)
    if (date) {
      results = results.filter((v) => isVendorAvailable(v, date, timeStart, timeEnd))
    }

    // Filter by max_price — vendors with no active services are included regardless
    if (maxPrice !== undefined) {
      results = results.filter((v) => {
        const activeServices = v.vendor_services.filter((s) => s.active !== false)
        if (activeServices.length === 0) return true
        if (date) {
          return activeServices.some(
            (s) => getEffectivePrice(s.price, v.vendor_dynamic_pricing, date) <= maxPrice
          )
        }
        return activeServices.some((s) => s.price <= maxPrice)
      })
    }

    // Availability slots and blackout dates were only needed for the filters above.
    const data = results.map(
      ({ vendor_availability: _availability, vendor_blackout_dates: _blackouts, ...v }) => ({
        ...v,
        partners: toPublicPartner(v.partners),
      })
    )

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Vendors route error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
