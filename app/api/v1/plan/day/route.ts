import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database'

// ─── DB row types ─────────────────────────────────────────────────────────────

type BusinessRow      = Database['public']['Tables']['businesses']['Row']
type BusinessHoursRow = Database['public']['Tables']['business_hours']['Row']
type BusinessOfferRow = Database['public']['Tables']['business_offers']['Row']

type BusinessWithRelations = BusinessRow & {
  business_hours: BusinessHoursRow[]
  business_offers: BusinessOfferRow[]
}

// ─── Output types ─────────────────────────────────────────────────────────────

interface ActiveOffer {
  id: string
  title: string
  description: string | null
  offer_type: string | null
  discount_amount: number | null
  discount_percent: number | null
}

interface TimelineStop {
  business_id: string
  name: string
  category: string
  address: string | null
  logo_url: string | null
  estimated_arrival: string   // 'HH:MM'
  duration_minutes: number
  estimated_spend: number
  offer: ActiveOffer | null
}

interface SegmentSummary {
  label: 'afternoon' | 'evening' | 'night'
  window_start: string
  window_end: string
  stop_count: number
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function fromMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function rangesOverlap(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd
}

// ─── Travel time by transportation mode ──────────────────────────────────────

const TRAVEL_MINUTES: Record<string, number> = {
  car:       10,
  walking:   20,
  rideshare: 12,
}

// ─── Segment boundaries (minutes since midnight) ──────────────────────────────

const SEGMENT_BOUNDS = {
  afternoon: { start: toMins('12:00'), end: toMins('17:00') },
  evening:   { start: toMins('17:00'), end: toMins('21:00') },
  night:     { start: toMins('21:00'), end: toMins('04:00') + 24 * 60 }, // allow past midnight
}

type SegmentKey = keyof typeof SEGMENT_BOUNDS

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    // ── Parse params ──────────────────────────────────────────────────────────
    const planDateParam   = searchParams.get('plan_date')
    const timeStartParam  = searchParams.get('time_start') ?? '12:00'
    const timeEndParam    = searchParams.get('time_end')   ?? '23:00'
    const budgetParam     = searchParams.get('budget')
    const energyType      = searchParams.get('energy_type')  // 'relaxed' | 'active' | 'family_fun'
    const tagsParam       = searchParams.get('tags')          // comma-separated mood tags
    const groupType       = searchParams.get('group_type')    // comma-separated: 'solo','couple','friends','family','pet'
    const transportation  = searchParams.get('transportation') ?? 'car'
    const excludeParam    = searchParams.get('exclude')        // comma-separated business_id values to omit

    console.log('[day-plan] full querystring:', request.url)

    const userStart  = toMins(timeStartParam)
    const userEnd    = toMins(timeEndParam)
    const budget     = budgetParam ? Number(budgetParam) : Infinity
    const userTags   = tagsParam ? tagsParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []
    const travelMins = TRAVEL_MINUTES[transportation] ?? 10
    const excludeIds = excludeParam ? excludeParam.split(',').map(id => id.trim()).filter(Boolean) : []

    // Parse goingAs as an array (UI now sends comma-separated values)
    const groupTypes = groupType
      ? groupType.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : []
    console.log('[day-plan] group_type raw:', groupType, '→ groupTypes:', groupTypes)

    // Derive tag filters from group types and vibe.
    // 'family' → family_friendly tag, 'pet' → pet_friendly tag.
    // family_fun vibe maps to the same family_friendly filter (no energy_type='family' in DB).
    // OR logic: a business qualifies if its tags include ANY entry in this list.
    const groupTagFilters: string[] = []
    if (groupTypes.includes('family') || energyType === 'family_fun') {
      groupTagFilters.push('family_friendly')
    }
    if (groupTypes.includes('pet')) {
      groupTagFilters.push('pet_friendly')
    }

    if (userStart >= userEnd) {
      return NextResponse.json(
        { success: false, error: 'time_start must be before time_end' },
        { status: 400 }
      )
    }

    // ── Resolve plan date (defaults to today in server local time) ────────────
    let planDate: Date
    if (planDateParam && /^\d{4}-\d{2}-\d{2}$/.test(planDateParam)) {
      const [y, mo, d] = planDateParam.split('-').map(Number)
      planDate = new Date(y, mo - 1, d)
    } else {
      planDate = new Date()
    }
    const todayName = DAY_NAMES[planDate.getDay()]   // e.g. 'saturday'
    const todayISO  = [
      planDate.getFullYear(),
      String(planDate.getMonth() + 1).padStart(2, '0'),
      String(planDate.getDate()).padStart(2, '0'),
    ].join('-')

    // ── Fetch data ────────────────────────────────────────────────────────────
    const supabase = createSupabaseAdmin()

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        *,
        business_hours (*),
        business_offers (*)
      `)
      .eq('is_active', true)
      .returns<BusinessWithRelations[]>()

    if (error) {
      console.error('Day plan query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch businesses', details: error.message },
        { status: 500 }
      )
    }

    // ── Exclude businesses already shown in the current plan ─────────────────
    const excludeSet = new Set(excludeIds)
    const candidateBusinesses = excludeSet.size > 0
      ? (businesses ?? []).filter(biz => !excludeSet.has(biz.id))
      : (businesses ?? [])

    // ── Filter businesses ─────────────────────────────────────────────────────
    const eligible = candidateBusinesses.filter(biz => {
      // 1. Must have hours today that overlap with the user's window
      const todayHours = biz.business_hours.filter(h => h.day_of_week.toLowerCase() === todayName)
      if (todayHours.length === 0) return false

      const opensInWindow = todayHours.some(h =>
        rangesOverlap(userStart, userEnd, toMins(h.open_time), toMins(h.close_time))
      )
      if (!opensInWindow) return false

      // 2. Energy type match — skip for 'family_fun' (no such value in DB; handled via tag filter below)
      if (energyType && energyType !== 'family_fun' && biz.energy_type &&
          biz.energy_type.toLowerCase() !== energyType.toLowerCase()) {
        return false
      }

      // 3. Mood tag overlap (user's selected tags from the tag picker)
      if (userTags.length > 0) {
        const bizTags = (biz.tags ?? []).map(t => t.toLowerCase())
        const hasMatch = userTags.some(t => bizTags.includes(t))
        if (!hasMatch) return false
      }

      // 4. Group-type tag filters — OR logic across family_friendly / pet_friendly.
      //    Only applied when 'family' or 'pet' group types (or family_fun vibe) are active.
      if (groupTagFilters.length > 0) {
        const bizTags = (biz.tags ?? []).map(t => t.toLowerCase())
        const hasMatch = groupTagFilters.some(t => bizTags.includes(t))
        if (!hasMatch) return false
      }

      // 5. Exclusive tags — suppress family/pet businesses unless explicitly requested.
      //    Prevents family_friendly and pet_friendly venues from appearing in general plans.
      const bizTagsLower = (biz.tags ?? []).map(t => t.toLowerCase())
      if (!groupTagFilters.includes('family_friendly') && bizTagsLower.includes('family_friendly')) {
        return false
      }
      if (!groupTagFilters.includes('pet_friendly') && bizTagsLower.includes('pet_friendly')) {
        return false
      }

      return true
    })

    // ── Attach active offers ──────────────────────────────────────────────────
    function getActiveOffer(biz: BusinessWithRelations): ActiveOffer | null {
      for (const offer of biz.business_offers) {
        if (!offer.is_active) continue

        // Date validity
        if (offer.valid_from && todayISO < offer.valid_from) continue
        if (offer.valid_until && todayISO > offer.valid_until) continue

        // Day match
        if (offer.days_active && offer.days_active.length > 0) {
          const days = offer.days_active.map(d => d.toLowerCase())
          if (!days.includes(todayName)) continue
        }

        // Time overlap (if the offer has a time window)
        if (offer.time_start && offer.time_end) {
          if (!rangesOverlap(userStart, userEnd, toMins(offer.time_start), toMins(offer.time_end))) {
            continue
          }
        }

        return {
          id:               offer.id,
          title:            offer.title,
          description:      offer.description,
          offer_type:       offer.offer_type,
          discount_amount:  offer.discount_amount,
          discount_percent: offer.discount_percent,
        }
      }
      return null
    }

    // ── Assign each business to segment(s) it is open during ─────────────────
    type EligibleBiz = {
      biz: BusinessWithRelations
      offer: ActiveOffer | null
      openMins: { start: number; end: number }
    }

    const withOffers: EligibleBiz[] = eligible.map(biz => {
      // Use the first matching hours block for today
      const todayHours = biz.business_hours
        .filter(h => h.day_of_week.toLowerCase() === todayName)
        .sort((a, b) => toMins(a.open_time) - toMins(b.open_time))

      const openMins = todayHours.length > 0
        ? { start: toMins(todayHours[0].open_time), end: toMins(todayHours[0].close_time) }
        : { start: userStart, end: userEnd }

      return { biz, offer: getActiveOffer(biz), openMins }
    })

    // ── For each segment: collect candidates, sort, pick 1–3 ─────────────────
    function segmentCandidates(key: SegmentKey): EligibleBiz[] {
      const seg = SEGMENT_BOUNDS[key]
      // Clamp segment window to user's requested window
      const winStart = Math.max(seg.start, userStart)
      const winEnd   = Math.min(seg.end, userEnd)
      if (winStart >= winEnd) return []

      return withOffers
        .filter(({ openMins }) =>
          rangesOverlap(winStart, winEnd, openMins.start, openMins.end)
        )
        .sort((a, b) => {
          // is_featured DESC
          const featA = a.biz.is_featured ? 1 : 0
          const featB = b.biz.is_featured ? 1 : 0
          if (featB !== featA) return featB - featA
          // avg_spend ASC
          return (a.biz.avg_spend ?? 0) - (b.biz.avg_spend ?? 0)
        })
    }

    // ── Pick stops per segment, respecting budget ────────────────────────────
    const stops: TimelineStop[] = []
    let   runningSpend  = 0
    let   cursor        = userStart  // current time pointer (minutes)
    const segments: SegmentSummary[] = []

    const segmentOrder: SegmentKey[] = ['afternoon', 'evening', 'night']

    // Track which business IDs we've already added (no duplicates across segments)
    const usedIds = new Set<string>()

    for (const segKey of segmentOrder) {
      const seg    = SEGMENT_BOUNDS[segKey]
      const winStart = Math.max(seg.start, userStart)
      const winEnd   = Math.min(seg.end, userEnd)
      if (winStart >= winEnd) continue

      const candidates = segmentCandidates(segKey).filter(c => !usedIds.has(c.biz.id))
      if (candidates.length === 0) continue

      const segStops: TimelineStop[] = []

      for (const { biz, offer } of candidates) {
        if (segStops.length >= 3) break

        const spend    = biz.avg_spend ?? 0
        const duration = biz.avg_duration_minutes ?? 60

        // Budget gate: skip if adding this stop would bust the budget
        if (isFinite(budget) && runningSpend + spend > budget) continue

        // Arrival time: advance cursor past travel time if not the very first stop
        const arrivalMins = stops.length === 0 ? cursor : cursor + travelMins
        // Ensure arrival falls within segment window
        const clampedArrival = Math.max(arrivalMins, winStart)

        // Don't schedule if there's no time left before segment/user window ends
        if (clampedArrival + duration > winEnd && clampedArrival + duration > userEnd) continue

        const stop: TimelineStop = {
          business_id:       biz.id,
          name:              biz.name,
          category:          biz.category,
          address:           biz.address,
          logo_url:          biz.logo_url ?? null,
          estimated_arrival: fromMins(clampedArrival),
          duration_minutes:  duration,
          estimated_spend:   spend,
          offer,
        }

        segStops.push(stop)
        stops.push(stop)
        usedIds.add(biz.id)
        runningSpend += spend
        cursor = clampedArrival + duration  // advance cursor to end of this stop
      }

      if (segStops.length > 0) {
        segments.push({
          label:       segKey,
          window_start: fromMins(winStart),
          window_end:   fromMins(Math.min(winEnd, userEnd)),
          stop_count:   segStops.length,
        })
      }
    }

    // ── Compute totals ────────────────────────────────────────────────────────
    const totalDurationMinutes = stops.reduce((sum, s) => sum + s.duration_minutes, 0)
      + Math.max(0, stops.length - 1) * travelMins  // travel between stops

    return NextResponse.json({
      success: true,
      data: {
        timeline:               stops,
        total_estimated_spend:  runningSpend,
        total_duration_minutes: totalDurationMinutes,
        segments,
      },
    })
  } catch (err: unknown) {
    console.error('Day plan route error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
