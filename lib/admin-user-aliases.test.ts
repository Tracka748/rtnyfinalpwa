import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fakeSupabase, type Recorded } from '@/lib/test-support/fake-supabase'
import {
  SPECIAL_ROLES, attachAliasInfo, isSpecialUser, loadAliasData, mergeAliasInfo, type AssignmentRow,
} from './admin-user-aliases'

const NOW = new Date('2026-11-24T12:00:00Z')
const NONE = new Set<string>()
const asg = (over: Partial<AssignmentRow> = {}): AssignmentRow => ({
  user_id: 'u1', status: 'active', starts_at: null, expires_at: null, ...over,
})
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('isSpecialUser', () => {
  it('admin, promoter and organizer roles are special; user and null are not', () => {
    for (const role of ['admin', 'promoter', 'organizer']) expect(isSpecialUser({ id: 'u1', role }, NONE, [], NOW)).toBe(true)
    for (const role of ['user', null, undefined, 'owner']) expect(isSpecialUser({ id: 'u1', role }, NONE, [], NOW)).toBe(false)
  })

  it('is_organizer makes a user special, null or false does not', () => {
    expect(isSpecialUser({ id: 'u1', role: 'user', is_organizer: true }, NONE, [], NOW)).toBe(true)
    expect(isSpecialUser({ id: 'u1', role: 'user', is_organizer: false }, NONE, [], NOW)).toBe(false)
    expect(isSpecialUser({ id: 'u1', role: 'user', is_organizer: null }, NONE, [], NOW)).toBe(false)
  })

  it('owning a partner makes a user special', () => {
    expect(isSpecialUser({ id: 'u1', role: 'user' }, new Set(['u1']), [], NOW)).toBe(true)
    expect(isSpecialUser({ id: 'u1', role: 'user' }, new Set(['u2']), [], NOW)).toBe(false)
  })

  it('only an active, started, unexpired assignment of that user counts', () => {
    const u = { id: 'u1', role: 'user' }
    expect(isSpecialUser(u, NONE, [asg()], NOW)).toBe(true)
    expect(isSpecialUser(u, NONE, [asg({ starts_at: '2026-11-01T00:00:00Z', expires_at: '2026-12-01T00:00:00Z' })], NOW)).toBe(true)
    expect(isSpecialUser(u, NONE, [asg({ status: 'suspended' })], NOW)).toBe(false)
    expect(isSpecialUser(u, NONE, [asg({ status: 'revoked' })], NOW)).toBe(false)
    expect(isSpecialUser(u, NONE, [asg({ starts_at: '2026-12-01T00:00:00Z' })], NOW)).toBe(false) // not started
    expect(isSpecialUser(u, NONE, [asg({ expires_at: '2026-11-01T00:00:00Z' })], NOW)).toBe(false) // expired
    expect(isSpecialUser(u, NONE, [asg({ user_id: 'u2' })], NOW)).toBe(false) // someone else's
  })
})

describe('mergeAliasInfo', () => {
  const profiles = [
    { id: 'u1', role: 'promoter', email: 'a@x.com', order_count: 3 },
    { id: 'u2', role: 'user', email: 'b@x.com' },
    { id: 'u3', role: 'admin', email: 'c@x.com' },
  ]

  it('adds alias (string or null) and is_special, keeps order and every other field', () => {
    const out = mergeAliasInfo(profiles, [{ user_id: 'u1', alias: 'jane_doe' }], NONE, [], NOW)
    expect(out.map(p => p.id)).toEqual(['u1', 'u2', 'u3'])
    expect(out[0]).toEqual({ id: 'u1', role: 'promoter', email: 'a@x.com', order_count: 3, alias: 'jane_doe', is_special: true })
    expect(out[1]).toEqual({ id: 'u2', role: 'user', email: 'b@x.com', alias: null, is_special: false })
    expect(out[2].alias).toBeNull() // a special user with no alias: the case the UI will flag
    expect(out[2].is_special).toBe(true)
  })

  it('does not change its input', () => {
    const copy = JSON.parse(JSON.stringify(profiles))
    mergeAliasInfo(profiles, [], NONE, [], NOW)
    expect(profiles).toEqual(copy)
  })
})

describe('loadAliasData', () => {
  it('queries the three tables with at most 200 ids each, in as many chunks as needed', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => uuid(i))
    const f = fakeSupabase({ respond: () => ({ data: [], error: null }) })
    await loadAliasData(f.client, ids)
    for (const table of ['user_aliases', 'partners', 'user_specialist_assignments']) {
      const calls = f.calls.filter((c: Recorded) => c.table === table)
      expect(calls, table).toHaveLength(3) // 200 + 200 + 50
      const sizes = calls.map(c => Object.values(c.in)[0].length).sort((a, b) => a - b)
      expect(sizes).toEqual([50, 200, 200])
    }
    expect(f.calls).toHaveLength(9)
  })

  it('collects aliases, owner ids (skipping nulls) and assignments from every chunk', async () => {
    const f = fakeSupabase({
      respond: q => {
        if (q.table === 'user_aliases') return { data: [{ user_id: 'u1', alias: 'jane_doe' }], error: null }
        if (q.table === 'partners') return { data: [{ owner_id: 'u2' }, { owner_id: null }], error: null }
        return { data: [asg({ user_id: 'u3' })], error: null }
      },
    })
    const r = await loadAliasData(f.client, ['u1', 'u2', 'u3'])
    expect(r.aliasRows).toEqual([{ user_id: 'u1', alias: 'jane_doe' }])
    expect([...r.ownerIds]).toEqual(['u2'])
    expect(r.assignments).toEqual([asg({ user_id: 'u3' })])
  })

  it('throws the database error', async () => {
    const f = fakeSupabase({ respond: q => (q.table === 'partners' ? { data: null, error: { code: 'XX000', message: 'boom' } } : { data: [], error: null }) })
    await expect(loadAliasData(f.client, ['u1'])).rejects.toMatchObject({ code: 'XX000' })
  })
})

describe('attachAliasInfo', () => {
  it('returns an empty list without querying for no users', async () => {
    const f = fakeSupabase({})
    expect(await attachAliasInfo(f.client, [])).toEqual([])
    expect(f.calls).toHaveLength(0)
  })

  it('merges the loaded data into the rows', async () => {
    const f = fakeSupabase({
      respond: q => (q.table === 'user_aliases' ? { data: [{ user_id: 'u1', alias: 'jane_doe' }], error: null } : { data: [], error: null }),
    })
    const out = await attachAliasInfo(f.client, [{ id: 'u1', role: 'promoter' }, { id: 'u2', role: 'user' }])
    expect(out).toEqual([
      { id: 'u1', role: 'promoter', alias: 'jane_doe', is_special: true },
      { id: 'u2', role: 'user', alias: null, is_special: false },
    ])
  })

  it('fails soft: on a database error the rows come back without alias fields and only the code is logged', async () => {
    const LEAK = 'PGSECRET relation "user_aliases" detail'
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: '42P01', message: LEAK } }) })
    const rows = [{ id: 'u1', role: 'promoter', email: 'a@x.com' }]
    const out = await attachAliasInfo(f.client, rows)
    expect(out).toEqual(rows)
    expect('alias' in out[0]).toBe(false)
    expect('is_special' in out[0]).toBe(false)
    expect(logged()).toContain('code=42P01')
    expect(logged()).not.toContain(LEAK)
  })

  it('a thrown error is also soft and logs an unknown code', async () => {
    const f = fakeSupabase({ respond: () => { throw new Error('boom') } })
    const out = await attachAliasInfo(f.client, [{ id: 'u1', role: 'user' }])
    expect(out).toEqual([{ id: 'u1', role: 'user' }])
    expect(logged()).toContain('code=unknown')
  })
})

describe('stays in sync with public.is_special_user', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261122100000_user_aliases.sql'), 'utf8')
  const fn = sql.slice(sql.indexOf('create or replace function public.is_special_user'), sql.indexOf('create or replace function public.user_specialist_alias_trg'))

  it('uses the same role list', () => {
    const m = /p\.role in \(([^)]*)\)/.exec(fn)
    expect(m).not.toBeNull()
    const roles = [...(m as RegExpExecArray)[1].matchAll(/'([^']+)'/g)].map(x => x[1])
    expect([...roles].sort()).toEqual([...SPECIAL_ROLES].sort())
  })

  it('uses the same is_organizer, partner-owner and assignment rules', () => {
    expect(fn).toContain('coalesce(p.is_organizer, false)')
    expect(fn).toContain('pt.owner_id = p_user_id')
    expect(fn).toContain("a.status = 'active'")
    expect(fn).toContain('(a.starts_at is null or a.starts_at <= now())')
    expect(fn).toContain('(a.expires_at is null or a.expires_at > now())')
  })
})
