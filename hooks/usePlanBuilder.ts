'use client'

import { useState, useCallback, useMemo } from 'react'

// ─── Category → DB type mapping for client-side filtering ────────────────────

const CATEGORY_TO_TYPE: Record<string, string[]> = {
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
  'venue':         ['venue'],
}

// ─── Domain types (mirrored from DB schema) ───────────────────────────────────

export interface VendorService {
  id: string
  vendor_id: string
  title: string
  category: string
  price: number
  description: string | null
  duration_hours: number | null
  includes: unknown
  active: boolean | null
  is_featured: boolean | null
}

export interface DynamicPricingRule {
  id: string
  vendor_id: string
  day_of_week: string | null
  price_multiplier: number | null
}

export interface VendorAvailabilitySlot {
  id: string
  vendor_id: string
  start_time: string
  end_time: string
  booked: boolean | null
}

export interface VendorBlackoutDate {
  id: string
  vendor_id: string
  date: string
  reason: string | null
}

export interface ThemeRef {
  id: string
  name: string
}

export interface PartnerThemeTag {
  status: string
  first_approved_at: string | null
  themes: ThemeRef | null
}

export interface PartnerRef {
  id: string
  partner_theme_tags: PartnerThemeTag[]
}

export interface Vendor {
  id: string
  name: string
  type: string
  tier: string
  rating: number | null
  review_count: number | null
  bio: string | null
  location: string | null
  profile_image_url: string | null
  instant_book: boolean | null
  active: boolean | null
  available_days?: string[] | null
  base_price?: number | null
  price_unit?: string | null
  vendor_services: VendorService[]
  vendor_availability: VendorAvailabilitySlot[]
  vendor_dynamic_pricing: DynamicPricingRule[]
  vendor_blackout_dates: VendorBlackoutDate[]
  partners: PartnerRef | null
}

export interface PlanItem {
  vendorId: string
  vendorName: string
  vendorType: string
  basePrice: number | null
  priceUnit: string | null
}

export interface SelectedService {
  serviceId: string
  vendorId: string
  vendorName: string
  vendorTier: string
  serviceTitle: string
  category: string
  basePrice: number
  effectivePrice: number
}

export interface EventDetails {
  eventType: string
  eventDate: string
  timeStart: string
  timeEnd: string
  guestCount: string
  hasVenue: boolean | null
  budgetRange: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getEffectivePrice(
  basePrice: number,
  dynamicPricing: DynamicPricingRule[],
  date: string
): number {
  if (!date) return basePrice
  const dayName = DAY_NAMES[new Date(date).getDay()]
  const rule = dynamicPricing.find(r => r.day_of_week?.toLowerCase() === dayName)
  if (rule?.price_multiplier) {
    return Math.round(basePrice * rule.price_multiplier * 100) / 100
  }
  return basePrice
}

function budgetToMaxPrice(range: string): number | undefined {
  switch (range) {
    case 'Under $500':    return 500
    case '$500–$1,000':   return 1000
    case '$1,000–$2,500': return 2500
    case '$2,500–$5,000': return 5000
    default:              return undefined
  }
}

// ─── State shape ─────────────────────────────────────────────────────────────

interface PlanBuilderState {
  currentStep: number
  eventDetails: EventDetails
  vendors: Vendor[]
  vendorsLoading: boolean
  vendorsError: string | null
  categoryFilter: string
  themeFilter: string
  themeOptions: ThemeRef[]
  selectedServiceIds: Set<string>
  planItems: PlanItem[]
  notes: string
  contactEmail: string
  submitting: boolean
  submitted: boolean
  submittedId: string | null
  submitError: string | null
}

const initialEventDetails: EventDetails = {
  eventType: '',
  eventDate: '',
  timeStart: '',
  timeEnd: '',
  guestCount: '',
  hasVenue: null,
  budgetRange: '',
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanBuilder() {
  const [state, setState] = useState<PlanBuilderState>({
    currentStep: 1,
    eventDetails: initialEventDetails,
    vendors: [],
    vendorsLoading: false,
    vendorsError: null,
    categoryFilter: 'all',
    themeFilter: 'all',
    themeOptions: [],
    selectedServiceIds: new Set(),
    planItems: [],
    notes: '',
    contactEmail: '',
    submitting: false,
    submitted: false,
    submittedId: null,
    submitError: null,
  })

  // ── Derived: flat service lookup ──────────────────────────────────────────
  const serviceMap = useMemo(() => {
    const map = new Map<string, { service: VendorService; vendor: Vendor }>()
    for (const vendor of state.vendors) {
      for (const service of vendor.vendor_services) {
        map.set(service.id, { service, vendor })
      }
    }
    return map
  }, [state.vendors])

  // ── Derived: selected services with effective pricing ─────────────────────
  const selectedServices = useMemo((): SelectedService[] => {
    const result: SelectedService[] = []
    for (const id of state.selectedServiceIds) {
      const entry = serviceMap.get(id)
      if (!entry) continue
      const { service, vendor } = entry
      result.push({
        serviceId: id,
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorTier: vendor.tier,
        serviceTitle: service.title,
        category: service.category,
        basePrice: service.price,
        effectivePrice: getEffectivePrice(
          service.price,
          vendor.vendor_dynamic_pricing,
          state.eventDetails.eventDate
        ),
      })
    }
    return result
  }, [state.selectedServiceIds, serviceMap, state.eventDetails.eventDate])

  const estimatedTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.effectivePrice, 0),
    [selectedServices]
  )

  // Client-side filtering: category pill → DB type mapping, plus optional day-of-week check.
  // Runs on the already-fetched vendor list so pill changes are instant (no re-fetch).
  const filteredVendors = useMemo(() => {
    const { vendors, categoryFilter, themeFilter, eventDetails } = state

    let list = vendors

    // Only apply available_days filtering when the vendor has explicitly restricted
    // availability (1–3 days listed). Empty/null arrays and broad schedules (4+ days)
    // are treated as "always available" so a day mismatch never empties the grid.
    if (eventDetails.eventDate) {
      const eventDay = new Date(eventDetails.eventDate)
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase()
      list = list.filter(v => {
        const days = v.available_days
        const isRestricted = days && days.length > 0 && days.length <= 3
        return isRestricted ? days.includes(eventDay) : true
      })
    }

    // Bug 2 fix: translate UI pill value → DB type enum values before comparing.
    if (categoryFilter !== 'all') {
      const dbTypes = CATEGORY_TO_TYPE[categoryFilter] ?? []
      if (dbTypes.length > 0) {
        list = list.filter(v => dbTypes.includes(v.type))
      }
    }

    // Theme sort (not a filter): vendors with an approved theme tag matching themeFilter
    // float to the top, but nothing is removed from the list. Matched by theme id, not
    // name, since names aren't guaranteed unique/stable for comparison. Array.prototype.sort
    // is stable (ES2019+), so relative order within each group is preserved.
    if (themeFilter !== 'all') {
      const hasMatchingTheme = (v: Vendor) =>
        v.partners?.partner_theme_tags.some(
          t => t.status === 'approved' && t.themes?.id === themeFilter
        ) ?? false
      list = [...list].sort((a, b) => Number(hasMatchingTheme(b)) - Number(hasMatchingTheme(a)))
    }

    return list
  }, [state.vendors, state.categoryFilter, state.themeFilter, state.eventDetails.eventDate])

  const canProceedFromStep1 = state.eventDetails.eventType.length > 0

  // ── Actions ───────────────────────────────────────────────────────────────

  const setEventDetail = useCallback(
    <K extends keyof EventDetails>(key: K, value: EventDetails[K]) => {
      setState(s => ({ ...s, eventDetails: { ...s.eventDetails, [key]: value } }))
    },
    []
  )

  const fetchVendors = useCallback(async (details: EventDetails) => {
    setState(s => ({ ...s, vendorsLoading: true, vendorsError: null }))
    try {
      const params = new URLSearchParams()
      if (details.eventDate) params.set('date', details.eventDate)
      if (details.timeStart) params.set('time_start', details.timeStart)
      if (details.timeEnd) params.set('time_end', details.timeEnd)
      const maxPrice = budgetToMaxPrice(details.budgetRange)
      if (maxPrice !== undefined) params.set('max_price', String(maxPrice))

      const res = await fetch(`/api/v1/vendors?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load vendors')
      const json = await res.json()
      setState(s => ({ ...s, vendors: json.data ?? [], vendorsLoading: false }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setState(s => ({ ...s, vendorsError: msg, vendorsLoading: false }))
    }
  }, [])

  const fetchThemeOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/themes')
      if (!res.ok) return
      const json = await res.json()
      setState(s => ({ ...s, themeOptions: json.data ?? [] }))
    } catch {
      // Non-critical: theme filter UI simply has no options to show on failure.
    }
  }, [])

  const setCategoryFilter = useCallback((category: string) => {
    setState(s => ({ ...s, categoryFilter: category }))
  }, [])

  const setThemeFilter = useCallback((theme: string) => {
    setState(s => ({ ...s, themeFilter: theme }))
  }, [])

  const addToPlan = useCallback((vendor: Vendor) => {
    setState(s => {
      if (s.planItems.some(item => item.vendorId === vendor.id)) return s
      const cheapestService = vendor.vendor_services
        .filter(sv => sv.active !== false)
        .sort((a, b) => a.price - b.price)[0]
      const newItem: PlanItem = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorType: vendor.type,
        basePrice: vendor.base_price ?? cheapestService?.price ?? null,
        priceUnit: vendor.price_unit ?? null,
      }
      return { ...s, planItems: [...s.planItems, newItem] }
    })
  }, [])

  const removeFromPlan = useCallback((vendorId: string) => {
    setState(s => ({ ...s, planItems: s.planItems.filter(item => item.vendorId !== vendorId) }))
  }, [])

  const toggleService = useCallback((serviceId: string) => {
    setState(s => {
      const next = new Set(s.selectedServiceIds)
      if (next.has(serviceId)) next.delete(serviceId)
      else next.add(serviceId)
      return { ...s, selectedServiceIds: next }
    })
  }, [])

  const goNext = useCallback(() => {
    setState(s => {
      if (s.currentStep === 1) {
        // Kick off vendor + theme option fetches before advancing so step 2 loads with data
        fetchVendors(s.eventDetails)
        fetchThemeOptions()
      }
      return { ...s, currentStep: s.currentStep + 1 }
    })
  }, [fetchVendors, fetchThemeOptions])

  const goBack = useCallback(() => {
    setState(s => ({ ...s, currentStep: Math.max(1, s.currentStep - 1) }))
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState(s => ({ ...s, notes }))
  }, [])

  const setContactEmail = useCallback((contactEmail: string) => {
    setState(s => ({ ...s, contactEmail }))
  }, [])

  const submitRequest = useCallback(async () => {
    setState(s => ({ ...s, submitting: true, submitError: null }))
    try {
      // Derive needs from unique categories of selected services
      const needs = [...new Set(selectedServices.map(s => s.category))]

      const body = {
        event_type: state.eventDetails.eventType,
        event_date: state.eventDetails.eventDate || null,
        time_start: state.eventDetails.timeStart || null,
        time_end: state.eventDetails.timeEnd || null,
        budget_range: state.eventDetails.budgetRange || null,
        guest_count: state.eventDetails.guestCount || null,
        has_venue: state.eventDetails.hasVenue,
        selected_service_ids: [...state.selectedServiceIds],
        selected_package_id: null,
        estimated_total: estimatedTotal || null,
        needs,
        notes: state.notes || null,
        contact_email: state.contactEmail || null,
      }

      const res = await fetch('/api/v1/plan/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to submit request')
      }
      const json = await res.json()
      setState(s => ({
        ...s,
        submitting: false,
        submitted: true,
        submittedId: json.data?.id ?? null,
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setState(s => ({ ...s, submitting: false, submitError: msg }))
    }
  }, [state, selectedServices, estimatedTotal])

  return {
    // state
    currentStep: state.currentStep,
    eventDetails: state.eventDetails,
    vendors: filteredVendors,
    vendorsLoading: state.vendorsLoading,
    vendorsError: state.vendorsError,
    categoryFilter: state.categoryFilter,
    themeFilter: state.themeFilter,
    themeOptions: state.themeOptions,
    selectedServiceIds: state.selectedServiceIds,
    planItems: state.planItems,
    notes: state.notes,
    contactEmail: state.contactEmail,
    submitting: state.submitting,
    submitted: state.submitted,
    submittedId: state.submittedId,
    submitError: state.submitError,
    // derived
    selectedServices,
    estimatedTotal,
    serviceMap,
    canProceedFromStep1,
    // actions
    setEventDetail,
    setCategoryFilter,
    setThemeFilter,
    toggleService,
    addToPlan,
    removeFromPlan,
    goNext,
    goBack,
    setNotes,
    setContactEmail,
    submitRequest,
  }
}
