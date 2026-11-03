import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireCapability: vi.fn(),
  requireUser: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireAdmin: h.requireAdmin, requireCapability: h.requireCapability, requireUser: h.requireUser }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase } from '@/lib/test-support/fake-supabase'
import { POST as submit } from './[id]/versions/[versionId]/submit/route'
import { POST as withdraw } from './[id]/versions/[versionId]/withdraw/route'
import { POST as approve } from './[id]/versions/[versionId]/approve/route'
import { POST as requestChanges } from './[id]/versions/[versionId]/request-changes/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PKG = '11111111-1111-1111-1111-111111111111'
const VER = '22222222-2222-2222-2222-222222222222'
const ROW = { id: VER, status: 'x', revision: 3 }

type Handler = typeof submit
const post = (handler: Handler, body: unknown) =>
  handler(
    new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as unknown as NextRequest,
    { params: Promise.resolve({ id: PKG, versionId: VER }) }
  )

function setup() {
  const f = fakeSupabase({ respond: () => ({ data: ROW, error: null }) })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const session = { error: false, response: null, userId: SESSION }
  h.requireCapability.mockResolvedValue(session)
  h.requireAdmin.mockResolvedValue(session)
})

describe('submit', () => {
  it('moves draft|needs_changes -> in_review, writes updated_by from the session, checks the revision', async () => {
    const f = setup()
    expect((await post(submit, { expected_revision: 3 })).status).toBe(200)
    expect(f.calls[0]).toMatchObject({
      table: 'theme_package_versions', op: 'update',
      payload: { status: 'in_review', updated_by: SESSION },
      eq: { id: VER, package_id: PKG, revision: 3 },
      in: { status: ['draft', 'needs_changes'] },
    })
  })
  it('rejects an actor-like key and a bad revision before touching the DB', async () => {
    const f = setup()
    expect((await post(submit, { expected_revision: 3, updated_by: OTHER })).status).toBe(400)
    expect((await post(submit, { expected_revision: '3' })).status).toBe(400)
    expect((await post(submit, {})).status).toBe(400)
    expect(f.calls).toHaveLength(0)
  })
})

describe('withdraw', () => {
  it('moves in_review -> draft with updated_by from the session', async () => {
    const f = setup()
    expect((await post(withdraw, { expected_revision: 3 })).status).toBe(200)
    expect(f.calls[0]).toMatchObject({
      op: 'update',
      payload: { status: 'draft', updated_by: SESSION },
      in: { status: ['in_review'] },
    })
  })
})

describe('approve (admin)', () => {
  it('only from in_review, reviewed_by from the session, note stored', async () => {
    const f = setup()
    expect((await post(approve, { expected_revision: 3, note: 'Looks good' })).status).toBe(200)
    expect(f.calls[0]).toMatchObject({
      op: 'update',
      payload: { status: 'approved', reviewed_by: SESSION, review_note: 'Looks good' },
      eq: { id: VER, package_id: PKG, revision: 3 },
      in: { status: ['in_review'] }, // never straight from draft
    })
  })
  it('stores a null note when none is sent', async () => {
    const f = setup()
    await post(approve, { expected_revision: 3 })
    expect(f.calls[0].payload).toMatchObject({ review_note: null })
  })
  it('rejects a client-supplied reviewer and an over-long note without touching the DB', async () => {
    const f = setup()
    expect((await post(approve, { expected_revision: 3, reviewed_by: OTHER })).status).toBe(400)
    expect((await post(approve, { expected_revision: 3, note: 'x'.repeat(2001) })).status).toBe(400)
    expect(f.calls).toHaveLength(0)
  })
  it('uses requireAdmin, not a capability', async () => {
    setup()
    await post(approve, { expected_revision: 3 })
    expect(h.requireAdmin).toHaveBeenCalledTimes(1)
    expect(h.requireCapability).not.toHaveBeenCalled()
  })
})

describe('request-changes (admin)', () => {
  it('in_review -> needs_changes with reviewed_by from the session and the required note', async () => {
    const f = setup()
    expect((await post(requestChanges, { expected_revision: 3, note: 'Fix the cake' })).status).toBe(200)
    expect(f.calls[0]).toMatchObject({
      op: 'update',
      payload: { status: 'needs_changes', reviewed_by: SESSION, review_note: 'Fix the cake' },
      in: { status: ['in_review'] },
    })
  })
  it('requires a non-blank note and rejects a client-supplied reviewer', async () => {
    const f = setup()
    expect((await post(requestChanges, { expected_revision: 3 })).status).toBe(400)
    expect((await post(requestChanges, { expected_revision: 3, note: '  ' })).status).toBe(400)
    expect((await post(requestChanges, { expected_revision: 3, note: 'x', reviewed_by: OTHER })).status).toBe(400)
    expect(f.calls).toHaveLength(0)
  })
})
