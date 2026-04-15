import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database'

type VendorRow = Database['public']['Tables']['vendors']['Row']
type VendorServiceRow = Database['public']['Tables']['vendor_services']['Row']
type VendorAvailabilityRow = Database['public']['Tables']['vendor_availability']['Row']
type VendorDynamicPricingRow = Database['public']['Tables']['vendor_dynamic_pricing']['Row']
type VendorBlackoutDateRow = Database['public']['Tables']['vendor_blackout_dates']['Row']

type VendorResult = VendorRow & {
  vendor_services: VendorServiceRow[]
  vendor_availability: VendorAvailabilityRow[]
  vendor_dynamic_pricing: VendorDynamicPricingRow[]
  vendor_blackout_dates: VendorBlackoutDateRow[]
}

// Day-of-week label matching Postgres convention
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getEffectivePrice(
  basePrice: number,
  dynamicPricing: VendorDynamicPricingRow[],
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

    const { data: vendors, error } = await supabase
      .from('vendors')
      .select(`
        *,
        vendor_services (*),
        vendor_availability (*),
        vendor_dynamic_pricing (*),
        vendor_blackout_dates (*)
      `)
      .eq('active', true)
      .order('tier', { ascending: true })
      .order('rating', { ascending: false })
      .returns<VendorResult[]>()

    if (error) {
      console.error('Vendors query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vendors', details: error.message },
        { status: 500 }
      )
    }

    let results: VendorResult[] = vendors ?? []

    // Filter by service category
    if (category) {
      results = results.filter((v) =>
        v.vendor_services.some(
          (s) => s.category.toLowerCase() === category.toLowerCase() && s.active !== false
        )
      )
    }

    // Filter by availability (date + optional time window)
    if (date) {
      results = results.filter((v) => isVendorAvailable(v, date, timeStart, timeEnd))
    }

    // Filter by max_price — check if any active service is within budget (after dynamic pricing)
    if (maxPrice !== undefined && date) {
      results = results.filter((v) =>
        v.vendor_services
          .filter((s) => s.active !== false)
          .some((s) => getEffectivePrice(s.price, v.vendor_dynamic_pricing, date) <= maxPrice)
      )
    } else if (maxPrice !== undefined) {
      results = results.filter((v) =>
        v.vendor_services
          .filter((s) => s.active !== false)
          .some((s) => s.price <= maxPrice)
      )
    }

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('Vendors route error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
