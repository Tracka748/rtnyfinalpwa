import { describe, expect, it } from 'vitest'
import type { LiveDocument, PublicComponent, PublicOption } from '@/lib/theme-package-public'
import { validateSelection } from '@/lib/theme-package-public-validation'
import {
  availableOptions, canToggle, clampGuestCount, defaultGuestCount, describeSelection, initialSelection,
  isSavedChoiceArray, isSwappable, parseGuestInput, preselectedOption, reconcileSelection, restoreSelection,
  selectedOption, summarizeSelection, swapOption, toggleOptional, toRequestSelection,
} from '@/lib/package-selection'

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function opt(id: number, name: string, over: Partial<PublicOption> = {}): PublicOption {
  return {
    id: u(id), is_default: false, available: true,
    item: { name, description: null, item_type: 'food', image_url: null },
    pricing: { treatment: 'quote', price: null, pricing_model: null },
    provider: null, ...over,
  }
}
function comp(id: number, label: string, options: PublicOption[], over: Partial<PublicComponent> = {}): PublicComponent {
  return { id: u(id), slot_label: label, requirement: 'required', quantity: 1, notes: null, available: true, options, ...over }
}
function doc(components: PublicComponent[], over: Partial<LiveDocument> = {}): LiveDocument {
  return {
    key: 'spooky', occasion: 'Birthday', theme: null, version_id: u(900),
    meta: { title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: 10, max_guests: 40, published_at: null },
    requestable: true, components, ...over,
  }
}

// `base` shifts every id so the same package can be built as a "new version" with fresh uuids.
const cake = (base = 0) => comp(base + 1, 'Cake', [opt(base + 11, 'Cake A', { is_default: true }), opt(base + 12, 'Cake B'), opt(base + 13, 'Cake C', { available: false })])
const balloons = (base = 0) => comp(base + 2, 'Balloons', [opt(base + 21, 'Balloons', { is_default: true })], { requirement: 'optional_on' })
const dj = (base = 0) => comp(base + 3, 'DJ', [opt(base + 31, 'DJ Mix', { is_default: true }), opt(base + 32, 'DJ Live')], { requirement: 'optional_off' })
const booth = (base = 0) => comp(base + 4, 'Photo booth', [opt(base + 41, 'Booth', { is_default: true, available: false })], { requirement: 'optional_on', available: false })

const D = doc([cake(), balloons(), dj(), booth()])
const D2 = doc([cake(100), balloons(100), dj(100), booth(100)], { version_id: u(901) })

describe('option helpers', () => {
  it('availableOptions / isSwappable / canToggle', () => {
    expect(availableOptions(D.components[0]).map(o => o.id)).toEqual([u(11), u(12)])
    expect(isSwappable(D.components[0])).toBe(true)
    expect(isSwappable(D.components[1])).toBe(false)
    expect(canToggle(D.components[0])).toBe(false) // required
    expect(canToggle(D.components[1])).toBe(true)
    expect(canToggle(D.components[3])).toBe(false) // nothing available
  })
  it('preselectedOption prefers the available default, else the first available, else nothing', () => {
    expect(preselectedOption(D.components[0])?.id).toBe(u(11))
    const defaultGone = comp(7, 'X', [opt(71, 'A', { is_default: true, available: false }), opt(72, 'B')])
    expect(preselectedOption(defaultGone)?.id).toBe(u(72))
    expect(preselectedOption(D.components[3])).toBeUndefined()
  })
})

describe('initialSelection', () => {
  it('required on, optional_on on, optional_off off, an unavailable optional forced off', () => {
    expect(initialSelection(D)).toEqual({
      [u(1)]: { included: true, optionId: u(11) },
      [u(2)]: { included: true, optionId: u(21) },
      [u(3)]: { included: false, optionId: u(31) },
      [u(4)]: { included: false, optionId: '' },
    })
  })
  it('an unavailable default is replaced by the first available option', () => {
    const d = doc([comp(7, 'X', [opt(71, 'A', { is_default: true, available: false }), opt(72, 'B')], { requirement: 'optional_on' })])
    expect(initialSelection(d)[u(7)]).toEqual({ included: true, optionId: u(72) })
  })
  it('a required component with nothing available stays included with no option', () => {
    const d = doc([comp(8, 'Venue', [opt(81, 'Hall', { available: false })])])
    expect(initialSelection(d)[u(8)]).toEqual({ included: true, optionId: '' })
  })
})

describe('toggleOptional', () => {
  it('flips an optional component on and off', () => {
    const s0 = initialSelection(D)
    const s1 = toggleOptional(s0, D, u(2))
    expect(s1[u(2)].included).toBe(false)
    expect(toggleOptional(s1, D, u(2))[u(2)].included).toBe(true)
    expect(s0[u(2)].included).toBe(true) // the input is not mutated
  })
  it('turns an optional_off component on', () => {
    expect(toggleOptional(initialSelection(D), D, u(3))[u(3)].included).toBe(true)
  })
  it('ignores required components, components with nothing available, and unknown ids', () => {
    const s = initialSelection(D)
    expect(toggleOptional(s, D, u(1))).toBe(s)
    expect(toggleOptional(s, D, u(4))).toBe(s)
    expect(toggleOptional(s, D, u(999))).toBe(s)
  })
})

describe('swapOption', () => {
  it('selects another available option', () => {
    const s = swapOption(initialSelection(D), D, u(1), u(12))
    expect(s[u(1)].optionId).toBe(u(12))
    expect(selectedOption(D, s, u(1))?.item?.name).toBe('Cake B')
  })
  it('refuses unavailable options, unknown options and options of another component', () => {
    const s = initialSelection(D)
    expect(swapOption(s, D, u(1), u(13))).toBe(s)
    expect(swapOption(s, D, u(1), u(999))).toBe(s)
    expect(swapOption(s, D, u(1), u(21))).toBe(s)
    expect(swapOption(s, D, u(999), u(12))).toBe(s)
  })
})

describe('toRequestSelection', () => {
  it('initial state: optional components state `included`, required ones send nothing', () => {
    expect(toRequestSelection(D, initialSelection(D))).toEqual({
      components: [
        { component_id: u(2), included: true },
        { component_id: u(3), included: false },
        { component_id: u(4), included: false },
      ],
    })
  })
  it('swaps send option_id; toggles send included; document order is kept', () => {
    let s = initialSelection(D)
    s = swapOption(s, D, u(1), u(12))
    s = toggleOptional(s, D, u(2))
    s = toggleOptional(s, D, u(3))
    s = swapOption(s, D, u(3), u(32))
    expect(toRequestSelection(D, s)).toEqual({
      components: [
        { component_id: u(1), option_id: u(12) },
        { component_id: u(2), included: false },
        { component_id: u(3), included: true, option_id: u(32) },
        { component_id: u(4), included: false },
      ],
    })
  })
  it('never sends included for a required component', () => {
    const s = swapOption(initialSelection(D), D, u(1), u(12))
    const entry = toRequestSelection(D, s).components.find(c => c.component_id === u(1))
    expect(entry).toEqual({ component_id: u(1), option_id: u(12) })
    expect(entry).not.toHaveProperty('included')
  })
  it('never sends an option for an excluded component', () => {
    const s = swapOption(initialSelection(D), D, u(3), u(32)) // DJ is off
    expect(toRequestSelection(D, s).components.find(c => c.component_id === u(3))).toEqual({ component_id: u(3), included: false })
  })
  it('only ever contains component_id, included and option_id', () => {
    let s = swapOption(initialSelection(D), D, u(1), u(12))
    s = toggleOptional(s, D, u(3))
    for (const entry of toRequestSelection(D, s).components) {
      expect(Object.keys(entry).every(k => ['component_id', 'included', 'option_id'].includes(k))).toBe(true)
    }
  })
  it('is accepted by the server validator, including at the 30-component limit', () => {
    let s = swapOption(initialSelection(D), D, u(1), u(12))
    s = toggleOptional(s, D, u(3))
    expect(validateSelection(toRequestSelection(D, s)).ok).toBe(true)
    const many = doc(Array.from({ length: 30 }, (_, i) => comp(500 + i, `Add-on ${i}`, [opt(600 + i, `Item ${i}`, { is_default: true })], { requirement: 'optional_off' })))
    const body = toRequestSelection(many, initialSelection(many))
    expect(body.components).toHaveLength(30)
    expect(validateSelection(body).ok).toBe(true)
  })
})

describe('guest count', () => {
  it('clampGuestCount keeps the value within the package range', () => {
    expect(clampGuestCount(5, 10, 40)).toBe(10)
    expect(clampGuestCount(50, 10, 40)).toBe(40)
    expect(clampGuestCount(25, 10, 40)).toBe(25)
    expect(clampGuestCount(12.9, 10, 40)).toBe(12)
    expect(clampGuestCount(Number.NaN, 10, 40)).toBe(10)
    expect(clampGuestCount(Number.POSITIVE_INFINITY, 10, 40)).toBe(10)
  })
  it('falls back to 1 to 10000 when the package has no limits', () => {
    expect(clampGuestCount(0, null, null)).toBe(1)
    expect(clampGuestCount(-5, null, null)).toBe(1)
    expect(clampGuestCount(20000, null, null)).toBe(10000)
    expect(clampGuestCount(300, null, null)).toBe(300)
    expect(clampGuestCount(5, 10, null)).toBe(10)
    expect(clampGuestCount(500, null, 40)).toBe(40)
  })
  it('survives a misconfigured range (min above max)', () => {
    expect(clampGuestCount(25, 30, 20)).toBe(30)
  })
  it('defaultGuestCount is the package minimum, or 10 when there is none', () => {
    expect(defaultGuestCount(12, 40)).toBe(12)
    expect(defaultGuestCount(null, 40)).toBe(10)
    expect(defaultGuestCount(null, 8)).toBe(8)
    expect(defaultGuestCount(null, null)).toBe(10)
    expect(defaultGuestCount(1, null)).toBe(1)
  })
  it('parseGuestInput accepts digits only', () => {
    expect(parseGuestInput('25', 9)).toBe(25)
    expect(parseGuestInput(' 7 ', 9)).toBe(7)
    for (const bad of ['', 'abc', '12.5', '-3', '1234567', '1e3']) expect(parseGuestInput(bad, 9)).toBe(9)
  })
})

describe('describeSelection / restoreSelection', () => {
  const custom = () => {
    let s = initialSelection(D)
    s = swapOption(s, D, u(1), u(12)) // Cake B
    s = toggleOptional(s, D, u(2)) // balloons off
    s = toggleOptional(s, D, u(3)) // DJ on
    s = swapOption(s, D, u(3), u(32)) // DJ Live
    return s
  }

  it('round-trips on the same document', () => {
    const s = custom()
    expect(restoreSelection(describeSelection(D, s), D)).toEqual({ state: s, lost: 0 })
  })

  it('a default selection round-trips with nothing lost', () => {
    const s = initialSelection(D)
    expect(restoreSelection(describeSelection(D, s), D)).toEqual({ state: s, lost: 0 })
  })

  it('carries choices into a new version whose component and option ids are all new', () => {
    const { state, lost } = restoreSelection(describeSelection(D, custom()), D2)
    expect(lost).toBe(0)
    expect(state).toEqual({
      [u(101)]: { included: true, optionId: u(112) },
      [u(102)]: { included: false, optionId: u(121) },
      [u(103)]: { included: true, optionId: u(132) },
      [u(104)]: { included: false, optionId: '' },
    })
  })

  it('reconcileSelection does the same from the previous document and state', () => {
    expect(reconcileSelection(D, custom(), D2)).toEqual(restoreSelection(describeSelection(D, custom()), D2))
  })

  it('falls back to the default and counts a swap whose option no longer exists', () => {
    const gone = doc([comp(201, 'Cake', [opt(211, 'Cake A', { is_default: true })]), balloons(200)])
    const { state, lost } = restoreSelection(describeSelection(D, custom()), gone)
    expect(state[u(201)]).toEqual({ included: true, optionId: u(211) })
    expect(state[u(202)].included).toBe(false) // the balloons toggle is carried over
    // lost: the Cake B swap (option gone) + the DJ add-on (component gone)
    expect(lost).toBe(2)
  })

  it('falls back to the default when the swapped option became unavailable', () => {
    const d = doc([comp(301, 'Cake', [opt(311, 'Cake A', { is_default: true }), opt(312, 'Cake B', { available: false })])])
    const { state, lost } = restoreSelection(describeSelection(D, custom()), d)
    expect(state[u(301)].optionId).toBe(u(311))
    expect(lost).toBeGreaterThanOrEqual(1)
  })

  it('removed default components are not counted as lost', () => {
    const { lost } = restoreSelection(describeSelection(D, initialSelection(D)), doc([cake(400)]))
    expect(lost).toBe(0)
  })

  it('a required component stays included, and an optional one that became required is forced on', () => {
    const requiredNow = doc([comp(501, 'Balloons', [opt(511, 'Balloons', { is_default: true })])]) // was optional_on
    const balloonsOff = toggleOptional(initialSelection(D), D, u(2)) // only the balloons toggle differs from the defaults
    const { state, lost } = restoreSelection(describeSelection(D, balloonsOff), requiredNow)
    expect(state[u(501)].included).toBe(true)
    expect(lost).toBe(1) // the "off" choice cannot be kept on a required component
  })

  it('isSavedChoiceArray accepts describeSelection output and rejects junk', () => {
    const saved = describeSelection(D, custom())
    expect(isSavedChoiceArray(saved)).toBe(true)
    expect(isSavedChoiceArray([])).toBe(true)
    expect(isSavedChoiceArray('x')).toBe(false)
    expect(isSavedChoiceArray(null)).toBe(false)
    expect(isSavedChoiceArray([{ ...saved[0], included: 'yes' }])).toBe(false)
    expect(isSavedChoiceArray([{ componentId: 'a' }])).toBe(false)
    expect(isSavedChoiceArray(Array.from({ length: 61 }, () => saved[0]))).toBe(false)
  })
})

describe('summarizeSelection', () => {
  it('lists included components only, marking swaps and add-ons', () => {
    const base = summarizeSelection(D, initialSelection(D))
    expect(base.map(l => [l.slotLabel, l.name, l.swapped, l.addOn])).toEqual([
      ['Cake', 'Cake A', false, false],
      ['Balloons', 'Balloons', false, true],
    ])
    const swapped = summarizeSelection(D, swapOption(initialSelection(D), D, u(1), u(12)))
    expect(swapped[0]).toMatchObject({ name: 'Cake B', swapped: true })
  })
  it('includes a switched-on add-on and carries the quantity', () => {
    const d = doc([comp(1, 'Cake', [opt(11, 'Cake A', { is_default: true })], { quantity: 2 }), dj()])
    const lines = summarizeSelection(d, toggleOptional(initialSelection(d), d, u(3)))
    expect(lines.map(l => [l.slotLabel, l.quantity, l.addOn])).toEqual([['Cake', 2, false], ['DJ', 1, true]])
  })
  it('shows "To be assigned" for an included component with no option', () => {
    const d = doc([comp(8, 'Venue', [opt(81, 'Hall', { available: false })])])
    expect(summarizeSelection(d, initialSelection(d))[0].name).toBe('To be assigned')
  })
})
