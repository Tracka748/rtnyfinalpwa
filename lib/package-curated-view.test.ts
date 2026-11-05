import { describe, expect, it } from 'vitest'
import {
  curatedBarText, customizeBarText, customizeSubtotalText, includedItems, isCuratedSelection, primaryAction,
  showCustomizeLink, showItemPrices, toParagraphs,
} from '@/lib/package-curated-view'
import { initialSelection, swapOption, toggleOptional } from '@/lib/package-selection'
import type { LiveDocument, PublicComponent, PublicOption } from '@/lib/theme-package-public'
import type { PublicPackagePricing } from '@/lib/theme-package-pricing'

const option = (id: string, name: string, over: Partial<PublicOption> = {}): PublicOption => ({
  id, is_default: false, available: true,
  item: { name, description: null, item_type: 'food', image_url: null },
  pricing: { treatment: 'quote', price: null, pricing_model: null },
  provider: null,
  ...over,
})
const component = (id: string, label: string, requirement: string, options: PublicOption[], over: Partial<PublicComponent> = {}): PublicComponent => ({
  id, slot_label: label, requirement, quantity: 1, notes: null,
  available: options.find(o => o.is_default)?.available ?? false,
  options, ...over,
})

const STRUCTURED: PublicPackagePricing = {
  mode: 'structured', reservable: true, lines: ['$675 for 10 guests'], notes: [],
  terms: { base_price: 675, included_guests: 10, extra_guest_price: 30, service_charge_pct: 20, service_charge_label: null, deposit_amount: 200, balance_due_days: 10 },
}
const FREE_TEXT: PublicPackagePricing = { mode: 'free_text', reservable: true, lines: [], notes: [], free_text: 'Call for pricing' }

function doc(over: Partial<LiveDocument> = {}): LiveDocument {
  return {
    key: 'spooky', occasion: 'Birthday', theme: null, version_id: 'v1', requestable: true, pricing: STRUCTURED,
    meta: { title: 'Spooky Birthday', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: 10, max_guests: 40, published_at: null },
    components: [
      component('c1', 'Cake', 'required', [option('o1', 'Chocolate cake', { is_default: true, provider: { type: 'partner', name: 'Cake Co' } })], { quantity: 2 }),
      component('c2', 'Music', 'optional_on', [option('o2', 'DJ Vee', { is_default: true })]),
      component('c3', 'Balloons', 'optional_off', [option('o3', 'Balloon arch', { is_default: true })]),
    ],
    ...over,
  }
}

describe('includedItems', () => {
  it('lists required and optional_on defaults, never optional_off', () => {
    expect(includedItems(doc()).map(i => i.name)).toEqual(['Chocolate cake', 'DJ Vee'])
  })
  it('carries quantity and provider', () => {
    expect(includedItems(doc())[0]).toMatchObject({ componentId: 'c1', quantity: 2, providerName: 'Cake Co', unavailable: false })
    expect(includedItems(doc())[1]).toMatchObject({ quantity: 1, providerName: null })
  })
  it('an item whose default option is unavailable is marked unavailable', () => {
    const d = doc({ components: [component('c1', 'Cake', 'required', [option('o1', 'Cake', { is_default: true, available: false })])] })
    expect(includedItems(d)[0].unavailable).toBe(true)
  })
  it('a component with a missing default option counts as unavailable', () => {
    const d = doc({ components: [component('c1', 'Cake', 'required', [option('o1', 'Cake')])] })
    expect(includedItems(d)[0]).toMatchObject({ unavailable: true, name: 'To be assigned' })
  })
  it('component available, default option unavailable, another option available -> unavailable (reads the default option itself)', () => {
    // Deliberately inconsistent flags: even if the component-level flag says available, the default decides.
    const d = doc({
      components: [
        component('c1', 'Cake', 'required', [
          option('o1', 'Chocolate cake', { is_default: true, available: false }),
          option('o2', 'Vanilla cake', { available: true }),
        ], { available: true }),
      ],
    })
    const [item] = includedItems(d)
    expect(item.name).toBe('Chocolate cake') // the default is shown, not the swap
    expect(item.unavailable).toBe(true)
  })
})

describe('primaryAction', () => {
  it('structured terms: Reserve with the deposit underneath', () => {
    expect(primaryAction(doc())).toEqual({ kind: 'reserve', label: 'Reserve your date', sublabel: '$200 deposit to reserve', disabled: false })
  })
  it('structured terms without a deposit: Reserve with no sublabel', () => {
    const p = { ...STRUCTURED, terms: { ...STRUCTURED.terms!, deposit_amount: 0 } }
    expect(primaryAction(doc({ pricing: p }))).toMatchObject({ kind: 'reserve', sublabel: null })
  })
  it('free-text terms: Reserve with no sublabel', () => {
    expect(primaryAction(doc({ pricing: FREE_TEXT }))).toMatchObject({ kind: 'reserve', sublabel: null, disabled: false })
  })
  it('no pricing terms: Customize & request a quote', () => {
    expect(primaryAction(doc({ pricing: null }))).toEqual({ kind: 'customize', label: 'Customize & request a quote', sublabel: null, disabled: false })
  })
  it('not requestable: disabled "Currently unavailable", for every kind of package', () => {
    for (const pricing of [STRUCTURED, FREE_TEXT, null]) {
      expect(primaryAction(doc({ requestable: false, pricing }))).toEqual({ kind: 'unavailable', label: 'Currently unavailable', sublabel: null, disabled: true })
    }
  })
  it('component available, default option unavailable, another option available -> Reserve is disabled', () => {
    const d = doc({
      components: [
        component('c1', 'Cake', 'required', [option('o1', 'Chocolate cake', { is_default: true }), option('o2', 'Vanilla cake')]),
        component('c2', 'Music', 'optional_on', [
          option('o3', 'DJ Vee', { is_default: true, available: false }),
          option('o4', 'DJ Ray', { available: true }),
        ], { available: true }),
      ],
    })
    expect(primaryAction(d)).toMatchObject({ kind: 'unavailable', disabled: true, label: 'Currently unavailable' })
    expect(includedItems(d).map(i => i.unavailable)).toEqual([false, true])
  })
  it('an unavailable optional_off item does not block Reserve (it is not part of the curated package)', () => {
    const d = doc({
      components: [
        component('c1', 'Cake', 'required', [option('o1', 'Cake', { is_default: true })]),
        component('c3', 'Balloons', 'optional_off', [option('o3', 'Arch', { is_default: true, available: false })]),
      ],
    })
    expect(primaryAction(d).kind).toBe('reserve')
  })
  it('no-terms packages are not blocked by an unavailable default, since customizing can swap it', () => {
    const d = doc({ pricing: null, components: [component('c1', 'Cake', 'required', [option('o1', 'Cake', { is_default: true, available: false }), option('o2', 'Other')])] })
    expect(primaryAction(d).kind).toBe('customize')
  })
})

describe('what is shown', () => {
  it('Customize link only for packages with terms that can be requested', () => {
    expect(showCustomizeLink(doc())).toBe(true)
    expect(showCustomizeLink(doc({ pricing: FREE_TEXT }))).toBe(true)
    expect(showCustomizeLink(doc({ pricing: null }))).toBe(false)
    expect(showCustomizeLink(doc({ requestable: false }))).toBe(false)
  })
  it('item prices only for packages without terms', () => {
    expect(showItemPrices(doc())).toBe(false)
    expect(showItemPrices(doc({ pricing: FREE_TEXT }))).toBe(false)
    expect(showItemPrices(doc({ pricing: null }))).toBe(true)
  })
})

describe('curatedBarText', () => {
  it('structured: "Starting at <base> for <n> guests", singular for one', () => {
    expect(curatedBarText(doc(), null)).toEqual({ caption: null, text: 'Starting at $675 for 10 guests' })
    const one = { ...STRUCTURED, terms: { ...STRUCTURED.terms!, included_guests: 1, base_price: 99.5 } }
    expect(curatedBarText(doc({ pricing: one }), null).text).toBe('Starting at $99.50 for 1 guest')
  })
  it('free text: just the package title', () => {
    expect(curatedBarText(doc({ pricing: FREE_TEXT }), null)).toEqual({ caption: null, text: 'Spooky Birthday' })
  })
  it('no terms: the listed subtotal, with a placeholder until it is known', () => {
    expect(curatedBarText(doc({ pricing: null }), null)).toEqual({ caption: 'Listed subtotal', text: '—' })
    expect(curatedBarText(doc({ pricing: null }), { subtotal: 240, unpriced: 0 })).toEqual({ caption: 'Listed subtotal', text: '$240' })
    expect(curatedBarText(doc({ pricing: null }), { subtotal: 0, unpriced: 2 }).text).toBe('Price on request')
  })
})

describe('customizeSubtotalText', () => {
  it('shows "Price on request" instead of $0 when something is priced on request', () => {
    expect(customizeSubtotalText(0, 1)).toBe('Price on request')
    expect(customizeSubtotalText(0, 3)).toBe('Price on request')
  })
  it('shows "Included" when nothing is priced at all and nothing is on request', () => {
    expect(customizeSubtotalText(0, 0)).toBe('Included')
    expect(customizeSubtotalText(0, null)).toBe('Included')
  })
  it('formats a positive subtotal and shows a dash when unknown', () => {
    expect(customizeSubtotalText(1234.5, 1)).toBe('$1,234.50')
    expect(customizeSubtotalText(80, 0)).toBe('$80')
    expect(customizeSubtotalText(null, null)).toBe('—')
  })
})

describe('customizeBarText', () => {
  const base = { requestable: true, status: 'ready' as const, subtotal: 80, unpriced: 0 }
  it('ready: the subtotal, plus a note when some items are priced on request', () => {
    expect(customizeBarText(base)).toEqual({ text: '$80', note: null, dim: false })
    expect(customizeBarText({ ...base, unpriced: 1 }).note).toBe('+ 1 item priced on request')
    expect(customizeBarText({ ...base, unpriced: 2 }).note).toBe('+ 2 items priced on request')
  })
  it('zero subtotal never prints $0', () => {
    expect(customizeBarText({ ...base, subtotal: 0, unpriced: 2 })).toEqual({ text: 'Price on request', note: null, dim: false })
    expect(customizeBarText({ ...base, subtotal: 0, unpriced: 0 }).text).toBe('Included')
  })
  it('loading keeps the last numbers dimmed; error, rejected and unavailable say so', () => {
    expect(customizeBarText({ ...base, status: 'loading' }).dim).toBe(true)
    expect(customizeBarText({ ...base, status: 'error' }).text).toBe('Price unavailable right now')
    expect(customizeBarText({ ...base, status: 'rejected', rejectedMessage: 'required component "Cake" cannot be removed' })).toMatchObject({
      text: 'This combination isn’t available', note: 'required component "Cake" cannot be removed',
    })
    expect(customizeBarText({ ...base, requestable: false }).text).toBe('Unavailable right now')
  })
})

describe('toParagraphs', () => {
  it('splits on blank lines, keeps single line breaks, trims and drops empties', () => {
    expect(toParagraphs('One\nstill one\n\n  Two  \r\n\r\n\n\nThree')).toEqual(['One\nstill one', 'Two', 'Three'])
    expect(toParagraphs('')).toEqual([])
    expect(toParagraphs('  \n\n  ')).toEqual([])
  })
})

describe('isCuratedSelection', () => {
  it('true for the defaults, false after a toggle or a swap, true again when undone', () => {
    const d = doc({
      components: [
        component('c1', 'Cake', 'required', [option('o1', 'Chocolate', { is_default: true }), option('o2', 'Vanilla')]),
        component('c2', 'Music', 'optional_on', [option('o3', 'DJ', { is_default: true })]),
      ],
    })
    const sel = initialSelection(d)
    expect(isCuratedSelection(d, sel)).toBe(true)
    const toggled = toggleOptional(sel, d, 'c2')
    expect(isCuratedSelection(d, toggled)).toBe(false)
    expect(isCuratedSelection(d, toggleOptional(toggled, d, 'c2'))).toBe(true)
    expect(isCuratedSelection(d, swapOption(sel, d, 'c1', 'o2'))).toBe(false)
  })
})
