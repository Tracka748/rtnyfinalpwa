import { beforeEach, describe, expect, it, vi } from 'vitest'
import { transitionVersion } from '@/lib/package-api'
import { fakeSupabase, type Recorded } from '@/lib/test-support/fake-supabase'

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

const PKG = '11111111-1111-1111-1111-111111111111'
const VER = '22222222-2222-2222-2222-222222222222'
const base = {
  packageId: PKG, versionId: VER, expectedRevision: 3, from: ['draft', 'needs_changes'] as const,
  patch: { status: 'in_review', updated_by: 'u1' }, verb: 'submitted', scope: 'test',
}
const row = { id: VER, status: 'in_review', revision: 3, updated_at: 't' }

async function run(respond: (q: Recorded) => { data: unknown; error: unknown }) {
  const f = fakeSupabase({ respond })
  const res = await transitionVersion(f.client, base)
  return { status: res.status, body: await res.json(), calls: f.calls }
}

describe('transitionVersion', () => {
  it('does one conditional update scoped by id, package, revision and allowed statuses', async () => {
    const r = await run(() => ({ data: row, error: null }))
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ success: true, data: { version: row } })
    expect(r.calls).toHaveLength(1)
    expect(r.calls[0]).toMatchObject({
      table: 'theme_package_versions', op: 'update', payload: base.patch,
      eq: { id: VER, package_id: PKG, revision: 3 },
      in: { status: ['draft', 'needs_changes'] },
    })
  })

  it('404 when the version does not exist in that package', async () => {
    const r = await run(() => ({ data: null, error: null }))
    expect(r.status).toBe(404)
    expect(r.body).toEqual({ success: false, error: 'Package version not found' })
    expect(r.calls.map(c => c.op)).toEqual(['update', 'select'])
  })

  it('409 stale revision when the row exists with a different revision', async () => {
    const r = await run(q => ({ data: q.op === 'update' ? null : { id: VER, status: 'draft', revision: 5 }, error: null }))
    expect(r.status).toBe(409)
    expect(r.body.error).toContain('changed since you loaded it')
  })

  it('409 not-in-the-right-status when the revision matches', async () => {
    const r = await run(q => ({ data: q.op === 'update' ? null : { id: VER, status: 'in_review', revision: 3 }, error: null }))
    expect(r.status).toBe(409)
    expect(r.body).toEqual({ success: false, error: 'This version is in review and cannot be submitted' })
  })

  it('maps trigger errors: P0001 -> 400 with the DB message, 42501 -> 403', async () => {
    const p = await run(() => ({ data: null, error: { code: 'P0001', message: 'every component needs exactly one default option' } }))
    expect(p.status).toBe(400)
    expect(p.body.error).toBe('every component needs exactly one default option')
    const f = await run(() => ({ data: null, error: { code: '42501', message: 'only an admin can approve a package version' } }))
    expect(f.status).toBe(403)
    expect(f.body.error).toBe('Forbidden')
  })

  it('fails closed (500) when the follow-up read errors', async () => {
    const r = await run(q => (q.op === 'update' ? { data: null, error: null } : { data: null, error: { code: 'XX000', message: 'boom' } }))
    expect(r.status).toBe(500)
    expect(r.body).toEqual({ success: false, error: 'Something went wrong' })
  })
})
