import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  CATEGORY_INACTIVE, CURATOR_NOT_ELIGIBLE, FALLBACK_NAME, ROUTING_GENERIC, ROUTING_TARGET_MISSING,
  buildCoordinators, buildCurrentCategory, buildCurrentCurator, coordinatorIds, profileIdsToLoad,
  routingDbError, validateRoutingPatch,
} from './package-routing'

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'

describe('validateRoutingPatch', () => {
  it('accepts either field, both, or null to clear', () => {
    expect(validateRoutingPatch({ category_id: U1 })).toEqual({ ok: true, value: { category_id: U1 } })
    expect(validateRoutingPatch({ curator_id: U2 })).toEqual({ ok: true, value: { curator_id: U2 } })
    expect(validateRoutingPatch({ category_id: U1, curator_id: null })).toEqual({ ok: true, value: { category_id: U1, curator_id: null } })
    expect(validateRoutingPatch({ category_id: null, curator_id: null })).toEqual({ ok: true, value: { category_id: null, curator_id: null } })
  })

  it('leaves out a key that is not sent', () => {
    const r = validateRoutingPatch({ curator_id: null })
    expect(r.ok && 'category_id' in r.value).toBe(false)
  })

  it('rejects an empty body, unknown keys, bad ids and non-objects', () => {
    expect(validateRoutingPatch({}).ok).toBe(false)
    expect(validateRoutingPatch({ status: 'archived' }).ok).toBe(false)
    expect(validateRoutingPatch({ category_id: U1, theme_id: U2 }).ok).toBe(false)
    expect(validateRoutingPatch({ category_id: 'nope' }).ok).toBe(false)
    expect(validateRoutingPatch({ curator_id: 5 }).ok).toBe(false)
    expect(validateRoutingPatch({ curator_id: undefined }).ok).toBe(false)
    for (const bad of [null, [], 'x', 3]) expect(validateRoutingPatch(bad).ok).toBe(false)
  })
})

describe('routingDbError', () => {
  it('maps the trigger and foreign key codes to fixed messages', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(routingDbError({ code: '42501', message: 'curator must be an eligible coordinator' }, 't')).toEqual({ status: 400, message: CURATOR_NOT_ELIGIBLE })
    expect(routingDbError({ code: '22023' }, 't')).toEqual({ status: 400, message: CATEGORY_INACTIVE })
    expect(routingDbError({ code: '23503' }, 't')).toEqual({ status: 400, message: ROUTING_TARGET_MISSING })
  })

  it('never returns database text for anything else', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(routingDbError({ code: 'XX000', message: 'PGSECRET' }, 't')).toEqual({ status: 500, message: ROUTING_GENERIC })
    expect(routingDbError(null, 't').status).toBe(500)
    expect(routingDbError({ code: 'x'.repeat(50), message: 'PGSECRET' }, 't').message).toBe(ROUTING_GENERIC)
  })
})

describe('GET response helpers', () => {
  const profiles = [
    { id: 'a', first_name: 'Zoe', last_name: 'Adams' },
    { id: 'b', first_name: 'Amy', last_name: null },
    { id: 'c', first_name: null, last_name: null },
    { id: 'gone', first_name: 'Old', last_name: 'Curator' },
  ]

  it('reads distinct ids from the coordinator_id column', () => {
    expect(coordinatorIds([{ coordinator_id: 'a' }, { coordinator_id: 'a' }, { coordinator_id: 'b' }])).toEqual(['a', 'b'])
    expect(coordinatorIds(null)).toEqual([])
  })

  it('builds the picker with names only, sorted, with a fallback name', () => {
    const list = buildCoordinators(['a', 'b', 'c', 'missing'], profiles)
    expect(list).toEqual([
      { id: 'b', name: 'Amy' },
      { id: 'c', name: FALLBACK_NAME },
      { id: 'missing', name: FALLBACK_NAME },
      { id: 'a', name: 'Zoe Adams' },
    ])
    for (const o of list) expect(Object.keys(o).sort()).toEqual(['id', 'name'])
  })

  it('current curator: null when none, eligible when listed, named even when no longer eligible', () => {
    expect(buildCurrentCurator(null, ['a'], profiles)).toBeNull()
    expect(buildCurrentCurator('a', ['a', 'b'], profiles)).toEqual({ id: 'a', name: 'Zoe Adams', eligible: true })
    expect(buildCurrentCurator('gone', ['a'], profiles)).toEqual({ id: 'gone', name: 'Old Curator', eligible: false })
    expect(buildCurrentCurator('nobody', ['a'], profiles)).toEqual({ id: 'nobody', name: FALLBACK_NAME, eligible: false })
  })

  it('current category: null when none, and an inactive one is still returned with active false', () => {
    expect(buildCurrentCategory(null)).toBeNull()
    expect(buildCurrentCategory(undefined)).toBeNull()
    expect(buildCurrentCategory({ id: 'c1', key: 'birthday', label: 'Birthday', active: true }))
      .toEqual({ id: 'c1', key: 'birthday', label: 'Birthday', active: true })
    expect(buildCurrentCategory({ id: 'c2', key: 'old', label: 'Old', active: false })?.active).toBe(false)
  })

  it('loads names for every eligible coordinator plus the current curator, once', () => {
    expect(profileIdsToLoad(['a', 'b'], 'gone')).toEqual(['a', 'b', 'gone'])
    expect(profileIdsToLoad(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(profileIdsToLoad([], null)).toEqual([])
  })
})

describe('routing route source', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/api/v1/admin/packages/[id]/routing/route.ts'), 'utf8')

  it('is admin only on both methods and takes only the two routing fields from the body', () => {
    expect(src.match(/requireAdmin\(request\)/g)).toHaveLength(2)
    expect(src).not.toMatch(/requireCapability/)
    expect(src).toContain('readStrictBody(request, ROUTING_FIELDS)')
  })

  it('never returns raw error text', () => {
    expect(src).not.toMatch(/error\.message|err\.message|details:/)
    expect(src).toContain('routingDbError(')
  })

  it('exports only GET and PATCH', () => {
    expect([...src.matchAll(/export async function (\w+)/g)].map(m => m[1])).toEqual(['GET', 'PATCH'])
  })
})
