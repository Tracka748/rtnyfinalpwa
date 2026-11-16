// Source scans for the Plan My Event vendor wiring. Components and hooks cannot be rendered in these
// node tests (no JSX transform), so the decisions live in lib/plan-request-vendors.ts and
// lib/request-inbox-ui.ts (tested directly) and these scans check that the UI uses them.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('builder', () => {
  const hook = read('hooks/usePlanBuilder.ts')

  it('submitRequest sends the added vendors as ids only', () => {
    expect(hook).toContain('selected_vendor_ids: planVendorIds(state.planItems),')
    expect(hook).not.toMatch(/selected_vendor_ids:[^\n]*vendorName/)
  })

  it('addToPlan refuses a 21st vendor', () => {
    const add = hook.slice(hook.indexOf('const addToPlan'), hook.indexOf('const removeFromPlan'))
    expect(add).toContain('if (!canAddVendor(s.planItems.length)) return s')
  })
})

describe('VendorCard: Add to Plan cap', () => {
  const card = read('components/custom/plan/VendorCard.tsx')

  it('disables Add to Plan once the plan is full and shows the limit message at 14px', () => {
    expect(card).toContain('const planFull = !isInPlan && !canAddVendor(planItems.length)')
    expect(card).toContain('disabled={isInPlan || planFull}')
    expect(card).toMatch(/\{planFull && \(\s*<p id=\{`plan-full-\$\{vendor\.id\}`\} className="[^"]*\btext-sm\b[^"]*">\s*\{VENDOR_LIMIT_MESSAGE\}/)
    expect(card).toContain('aria-describedby={planFull ? `plan-full-${vendor.id}` : undefined}')
  })
})

describe('RequestForm copy', () => {
  const form = read('components/custom/plan/RequestForm.tsx')

  it('says the added vendors are what gets sent', () => {
    expect(form).toContain('<SectionLabel>Vendors in your request</SectionLabel>')
    expect(form).not.toContain('Vendors Added')
    expect(form).toMatch(/<p className="[^"]*\btext-sm\b[^"]*">\s*These vendors are sent to our planning team with your request\.\s*<\/p>/)
  })

  it('vendors without services get plain text, not the "No services selected" box', () => {
    expect(form).toMatch(/selectedServices\.length === 0 && planItems\.length > 0 \? \(\s*<p className="[^"]*\btext-sm\b[^"]*">\s*No specific services picked\. Our team will go over options with these vendors\.\s*<\/p>/)
    // The old box remains only for the case with neither vendors nor services.
    expect(form).toMatch(/\) : selectedServices\.length === 0 \? \(\s*<div[^>]*>\s*<p[^>]*>\s*No services selected\./)
  })
})

describe('30-service cap', () => {
  const hook = read('hooks/usePlanBuilder.ts')
  const card = read('components/custom/plan/VendorCard.tsx')

  it('toggleService refuses a 31st service but still removes', () => {
    const toggle = hook.slice(hook.indexOf('const toggleService'), hook.indexOf('const goNext'))
    expect(toggle).toMatch(/if \(next\.has\(serviceId\)\) next\.delete\(serviceId\)\s*\n[^\n]*\n\s*else if \(!canAddService\(s\.selectedServiceIds\.size\)\) return s\s*\n\s*else next\.add\(serviceId\)/)
  })

  it('ServiceRow is a real button with aria-pressed, 44px, a focus ring, and is blocked with the message', () => {
    const row = card.slice(card.indexOf('function ServiceRow'), card.indexOf('// ─── Vendor Card'))
    expect(row).toMatch(/<button\s+type="button"\s+aria-pressed=\{selected\}/)
    expect(row).toContain('aria-describedby={blocked ? describedBy : undefined}')
    expect(row).toContain('min-h-[44px]')
    expect(row).toContain('focus-visible:ring-2 focus-visible:ring-[#59ffa0]')
    expect(row).toContain('onClick={blocked ? undefined : onToggle}')
    expect(row).not.toMatch(/<div|<p[\s>]/) // phrasing content only inside a button
    expect(card).toContain('const servicesFull = !canAddService(selectedServiceIds.size)')
    expect(card).toContain('blocked={servicesFull && !selectedServiceIds.has(service.id)}')
    expect(card).toMatch(/<p id=\{servicesFullId\} className="[^"]*\btext-sm\b[^"]*">\s*\{SERVICE_LIMIT_MESSAGE\}/)
  })
})

describe('shown total = saved total', () => {
  const hook = read('hooks/usePlanBuilder.ts')
  const panel = read('components/custom/plan/PlanSummaryPanel.tsx')
  const form = read('components/custom/plan/RequestForm.tsx')

  it('the hook computes estimatedTotal with servicesTotal and sends it', () => {
    expect(hook).toContain('() => servicesTotal(selectedServices),')
    expect(hook).toContain('estimated_total: estimatedTotal || null,')
  })

  it('the summary panel never adds vendor prices and uses planTotalView', () => {
    expect(panel).not.toContain('planItems.reduce(')
    expect(panel).not.toMatch(/combinedTotal|mobileTotal/)
    expect(panel).toContain('planTotalView({')
    expect(panel).toMatch(/\{totalView\.showAmount \? \(/)
    expect(panel).toMatch(/<p className="[^"]*\btext-sm\b[^"]*">\{VENDOR_PRICING_NOTE\}<\/p>/)
    expect(panel).toMatch(/totalView\.showVendorNote && \(\s*<p className=\{cn\('[^']*\btext-sm\b/)
  })

  it('the review step shows the vendor note at 14px under the vendors', () => {
    expect(form).toMatch(/<p className="[^"]*\btext-sm\b[^"]*">\{VENDOR_PRICING_NOTE\}<\/p>/)
    expect(form).toContain('${estimatedTotal.toLocaleString(')
    expect(form).not.toContain('planItems.reduce(')
  })
})

describe('staff request page', () => {
  const page = read('app/(staff)/admin/requests/[id]/page.tsx')

  it('Vendors comes before Chosen services, with the same markup', () => {
    const vendors = page.indexOf('>Vendors</h3>')
    const services = page.indexOf('>Chosen services</h3>')
    expect(vendors).toBeGreaterThan(-1)
    expect(services).toBeGreaterThan(vendors)
    expect(page).toContain('<h3 className="mt-3 text-sm leading-5 text-[#7DD8E8]">Vendors</h3>')
    expect(page).toMatch(/plan\.vendors\.map\(\(v, i\) => \(\s*<li key=\{i\} className="break-words py-3 text-base leading-6 text-white">\s*\{v\.name\}\s*\{v\.category && <span className="text-\[#7DD8E8\]"> · \{v\.category\}<\/span>\}/)
  })

  it('each section renders only when it has entries', () => {
    expect(page).toContain('{plan.vendors.length > 0 && (')
    expect(page).toContain('{plan.services.length > 0 && (')
  })
})
