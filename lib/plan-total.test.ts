import { describe, expect, it } from 'vitest'
import { VENDOR_PRICING_NOTE, planTotalView, roundCents, servicesTotal } from '@/lib/plan-total'

describe('servicesTotal', () => {
  it('sums effective prices and rounds to cents', () => {
    expect(servicesTotal([{ effectivePrice: 0.1 }, { effectivePrice: 0.2 }])).toBe(0.3)
    expect(servicesTotal([{ effectivePrice: 100.1 }, { effectivePrice: 50.2 }])).toBe(150.3)
    expect(servicesTotal([{ effectivePrice: 337.5 }, { effectivePrice: 412.5 }])).toBe(750)
  })

  it('is 0 for no services, and ignores non-finite prices', () => {
    expect(servicesTotal([])).toBe(0)
    expect(servicesTotal([{ effectivePrice: NaN }, { effectivePrice: Infinity }, { effectivePrice: 10 }])).toBe(10)
  })

  it('roundCents rounds to two decimals', () => {
    expect(roundCents(19.999)).toBe(20)
    expect(roundCents(12.344)).toBe(12.34)
    expect(roundCents(12.346)).toBe(12.35)
  })
})

describe('planTotalView: the shown total is the saved total', () => {
  it('services only: amount shown, no vendor note', () => {
    expect(planTotalView({ servicesTotal: 500, serviceCount: 1, vendorCount: 0 }))
      .toEqual({ showAmount: true, amount: 500, showVendorNote: false })
  })

  it('vendors only: no amount (never "$0.00"), vendor note shown', () => {
    expect(planTotalView({ servicesTotal: 0, serviceCount: 0, vendorCount: 2 }))
      .toEqual({ showAmount: false, amount: 0, showVendorNote: true })
  })

  it('both: the amount is the services total only, plus the vendor note', () => {
    // A $500 service with vendors at $150/hr and $1,200 added: shown and saved are both 500.
    expect(planTotalView({ servicesTotal: 500, serviceCount: 1, vendorCount: 2 }))
      .toEqual({ showAmount: true, amount: 500, showVendorNote: true })
  })

  it('the amount is rounded to cents', () => {
    expect(planTotalView({ servicesTotal: 0.1 + 0.2, serviceCount: 2, vendorCount: 0 }).amount).toBe(0.3)
  })

  it('the vendor note copy', () => {
    expect(VENDOR_PRICING_NOTE).toBe('Vendor pricing is confirmed by our team.')
  })
})
