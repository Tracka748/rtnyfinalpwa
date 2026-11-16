// The Plan My Event total. The amount shown in the summary panel and the review step is the same
// number the builder saves as estimated_total: ticked services only, rounded to cents. Vendors added
// with "Add to Plan" are listed with their own price text but never added to it.

export const VENDOR_PRICING_NOTE = 'Vendor pricing is confirmed by our team.'

/** Rounds to cents, so float noise (0.1 + 0.2) never reaches the screen or the database. */
export const roundCents = (n: number): number => Math.round(n * 100) / 100

/** Sum of the ticked services' effective prices, rounded to cents. Non-finite prices count as 0. */
export function servicesTotal(services: ReadonlyArray<{ effectivePrice: number }>): number {
  return roundCents(services.reduce((sum, s) => sum + (Number.isFinite(s.effectivePrice) ? s.effectivePrice : 0), 0))
}

/**
 * What the total area shows. The amount appears only when services are ticked (so a vendors-only
 * plan never reads as "$0.00"); the vendor note appears whenever vendors are added.
 */
export function planTotalView(i: { servicesTotal: number; serviceCount: number; vendorCount: number }) {
  return {
    showAmount: i.serviceCount > 0,
    amount: roundCents(i.servicesTotal),
    showVendorNote: i.vendorCount > 0,
  }
}
