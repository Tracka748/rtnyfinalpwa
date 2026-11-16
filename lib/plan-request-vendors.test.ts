import { describe, expect, it } from 'vitest'
import {
  MAX_RAW, PLAN_VENDOR_LIMIT, SERVICE_ID_LIMIT, SERVICE_LIMIT_MESSAGE, VENDOR_LIMIT_MESSAGE, canAddService, canAddVendor,
  keepKnown, parseServiceIds, parseUuidList, parseVendorIds, planVendorIds,
} from '@/lib/plan-request-vendors'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('parseVendorIds', () => {
  it('missing or null is an empty list', () => {
    expect(parseVendorIds(undefined)).toEqual({ ok: true, ids: [] })
    expect(parseVendorIds(null)).toEqual({ ok: true, ids: [] })
    expect(parseVendorIds([])).toEqual({ ok: true, ids: [] })
  })

  it('a non-array is malformed', () => {
    for (const v of ['x', 5, {}, true, id(1)]) expect(parseVendorIds(v), String(v)).toEqual({ ok: false, reason: 'malformed' })
  })

  it('any element that is not a uuid string is malformed', () => {
    for (const bad of ['not-a-uuid', '', 5, null, {}, [], `${id(1)} `, id(1).slice(1)]) {
      expect(parseVendorIds([id(1), bad]), JSON.stringify(bad)).toEqual({ ok: false, reason: 'malformed' })
    }
  })

  it('more than 200 elements is malformed, even if they are duplicates', () => {
    expect(MAX_RAW).toBe(200)
    expect(parseVendorIds(Array(201).fill(id(1)))).toEqual({ ok: false, reason: 'malformed' })
    expect(parseVendorIds(Array(200).fill(id(1)))).toEqual({ ok: true, ids: [id(1)] })
  })

  it('lowercases and dedupes keeping the first position', () => {
    const hex = 'abcdef00-0000-4000-8000-00000000abcd'
    expect(parseVendorIds([id(3), hex.toUpperCase(), id(1), id(3), hex])).toEqual({ ok: true, ids: [id(3), hex, id(1)] })
  })

  it('20 distinct ids are accepted; 21 are rejected as too_many, never cut', () => {
    expect(PLAN_VENDOR_LIMIT).toBe(20)
    const twenty = Array.from({ length: 20 }, (_, i) => id(i + 1))
    expect(parseVendorIds(twenty)).toEqual({ ok: true, ids: twenty })
    expect(parseVendorIds([...twenty, ...twenty])).toEqual({ ok: true, ids: twenty })
    expect(parseVendorIds([...twenty, id(21)])).toEqual({ ok: false, reason: 'too_many' })
  })
})

describe('keepKnown', () => {
  it('keeps ids found in rows, in input order', () => {
    expect(keepKnown([id(3), id(1), id(2)], [{ id: id(2) }, { id: id(3) }])).toEqual([id(3), id(2)])
  })

  it('matches case-insensitively and ignores junk rows', () => {
    const hex = 'abcdef00-0000-4000-8000-00000000abcd'
    expect(keepKnown([hex], [{ id: hex.toUpperCase() }, { id: 5 }, {}, null as never])).toEqual([hex])
  })

  it('no rows keeps nothing', () => {
    expect(keepKnown([id(1)], [])).toEqual([])
    expect(keepKnown([id(1)], null)).toEqual([])
  })
})

describe('planVendorIds', () => {
  it('one id per added vendor, deduplicated, in the order added, and nothing else', () => {
    const items = [
      { vendorId: id(2), vendorName: 'B', basePrice: 900 },
      { vendorId: id(1), vendorName: 'A', basePrice: 100 },
      { vendorId: id(2), vendorName: 'B again', basePrice: 1 },
    ]
    expect(planVendorIds(items)).toEqual([id(2), id(1)])
  })
})

describe('parseUuidList / parseServiceIds', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => id(i + 1))

  it('missing or null is an empty list', () => {
    expect(parseServiceIds(undefined)).toEqual({ ok: true, ids: [] })
    expect(parseServiceIds(null)).toEqual({ ok: true, ids: [] })
    expect(parseUuidList([], 5)).toEqual({ ok: true, ids: [] })
  })

  it('a non-array or any non-uuid element is malformed', () => {
    for (const v of ['x', 5, {}, true, id(1)]) expect(parseServiceIds(v), String(v)).toEqual({ ok: false, reason: 'malformed' })
    for (const bad of ['not-a-uuid', '', 7, null, {}, []]) {
      expect(parseServiceIds([id(1), bad]), JSON.stringify(bad)).toEqual({ ok: false, reason: 'malformed' })
    }
  })

  it('more than 200 elements is malformed, even as duplicates', () => {
    expect(parseServiceIds(Array(201).fill(id(1)))).toEqual({ ok: false, reason: 'malformed' })
    expect(parseServiceIds(Array(200).fill(id(1)))).toEqual({ ok: true, ids: [id(1)] })
  })

  it('exactly 30 distinct are accepted; 31 distinct are too_many, never cut', () => {
    expect(SERVICE_ID_LIMIT).toBe(30)
    expect(parseServiceIds(ids(30))).toEqual({ ok: true, ids: ids(30) })
    expect(parseServiceIds([...ids(30), ...ids(30)])).toEqual({ ok: true, ids: ids(30) })
    expect(parseServiceIds(ids(31))).toEqual({ ok: false, reason: 'too_many' })
  })

  it('lowercases and dedupes keeping the first position', () => {
    const hex = 'abcdef00-0000-4000-8000-00000000abcd'
    expect(parseServiceIds([id(2), hex.toUpperCase(), id(1), hex, id(2)])).toEqual({ ok: true, ids: [id(2), hex, id(1)] })
  })

  it('the limit is a parameter; parseVendorIds is parseUuidList at 20', () => {
    expect(parseUuidList(ids(3), 2)).toEqual({ ok: false, reason: 'too_many' })
    expect(parseVendorIds(ids(21))).toEqual(parseUuidList(ids(21), 20))
    expect(parseVendorIds(ids(20))).toEqual(parseUuidList(ids(20), 20))
  })

  it('the service cap allows the 30th and refuses the 31st, with a visible message', () => {
    expect(canAddService(29)).toBe(true)
    expect(canAddService(30)).toBe(false)
    expect(SERVICE_LIMIT_MESSAGE).toBe('You can select up to 30 services.')
  })
})

describe('the Add to Plan cap', () => {
  it('allows the 20th vendor and refuses the 21st', () => {
    expect(canAddVendor(19)).toBe(true)
    expect(canAddVendor(20)).toBe(false)
    expect(VENDOR_LIMIT_MESSAGE).toBe('You can add up to 20 vendors.')
  })
})
