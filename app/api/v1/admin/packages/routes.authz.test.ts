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
  return {
    ...actual, // keeps the real CAPABILITIES constants
    requireAdmin: h.requireAdmin,
    requireCapability: h.requireCapability,
    requireUser: h.requireUser,
  }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { CAPABILITIES } from '@/lib/authz'
import * as packagesRoute from './route'
import * as packageRoute from './[id]/route'
import * as versionsRoute from './[id]/versions/route'
import * as versionRoute from './[id]/versions/[versionId]/route'
import * as draftRoute from './[id]/versions/[versionId]/draft/route'
import * as submitRoute from './[id]/versions/[versionId]/submit/route'
import * as withdrawRoute from './[id]/versions/[versionId]/withdraw/route'
import * as approveRoute from './[id]/versions/[versionId]/approve/route'
import * as requestChangesRoute from './[id]/versions/[versionId]/request-changes/route'

const ID = '11111111-1111-1111-1111-111111111111'
const VERSION_ID = '22222222-2222-2222-2222-222222222222'

type Handler = (req: NextRequest, ctx: { params: Promise<{ id: string; versionId: string }> }) => Promise<Response>
type Gate = 'view' | 'manage' | 'admin'

const cases: Array<{ name: string; handler: Handler; gate: Gate }> = [
  { name: 'GET packages', handler: packagesRoute.GET, gate: 'view' },
  { name: 'POST packages', handler: packagesRoute.POST, gate: 'manage' },
  { name: 'GET packages/[id]', handler: packageRoute.GET, gate: 'view' },
  { name: 'PATCH packages/[id]', handler: packageRoute.PATCH, gate: 'admin' },
  { name: 'POST packages/[id]/versions', handler: versionsRoute.POST, gate: 'manage' },
  { name: 'GET versions/[versionId]', handler: versionRoute.GET, gate: 'view' },
  { name: 'PUT versions/[versionId]/draft', handler: draftRoute.PUT, gate: 'manage' },
  { name: 'POST versions/[versionId]/submit', handler: submitRoute.POST, gate: 'manage' },
  { name: 'POST versions/[versionId]/withdraw', handler: withdrawRoute.POST, gate: 'manage' },
  { name: 'POST versions/[versionId]/approve', handler: approveRoute.POST, gate: 'admin' },
  { name: 'POST versions/[versionId]/request-changes', handler: requestChangesRoute.POST, gate: 'admin' },
]

const modules: Record<string, Record<string, unknown>> = {
  'route': packagesRoute,
  '[id]/route': packageRoute,
  '[id]/versions/route': versionsRoute,
  '[id]/versions/[versionId]/route': versionRoute,
  '[id]/versions/[versionId]/draft/route': draftRoute,
  '[id]/versions/[versionId]/submit/route': submitRoute,
  '[id]/versions/[versionId]/withdraw/route': withdrawRoute,
  '[id]/versions/[versionId]/approve/route': approveRoute,
  '[id]/versions/[versionId]/request-changes/route': requestChangesRoute,
}
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const denied = () => ({
  error: true,
  userId: null,
  response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  }),
})

const call = (handler: Handler, method = 'POST') =>
  handler(
    new Request('http://localhost/api/test', { method, body: method === 'GET' ? undefined : '{}' }) as unknown as NextRequest,
    { params: Promise.resolve({ id: ID, versionId: VERSION_ID }) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  h.requireAdmin.mockImplementation(async () => denied())
  h.requireCapability.mockImplementation(async () => denied())
  h.requireUser.mockImplementation(async () => denied())
})

describe('package routes are gated before any work', () => {
  it('the case table covers every exported HTTP handler (no handler can be added untested)', () => {
    const exported = Object.entries(modules).flatMap(([file, mod]) =>
      Object.keys(mod).filter(k => HTTP_METHODS.includes(k)).map(k => `${k} ${file}`)
    )
    expect(exported).toHaveLength(cases.length)
    expect(new Set(cases.map(c => c.handler)).size).toBe(cases.length)
  })

  it.each(cases)('$name returns 403 and never creates the admin client', async ({ name, handler }) => {
    const res = await call(handler, name.split(' ')[0])
    expect(res.status).toBe(403)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })

  it.each(cases.filter(c => c.gate === 'view'))('$name uses requireCapability(PACKAGES_VIEW, allow) only', async ({ name, handler }) => {
    await call(handler, name.split(' ')[0])
    expect(h.requireCapability).toHaveBeenCalledTimes(1)
    expect(h.requireCapability).toHaveBeenCalledWith(expect.anything(), CAPABILITIES.PACKAGES_VIEW, 'allow')
    expect(h.requireAdmin).not.toHaveBeenCalled()
  })

  it.each(cases.filter(c => c.gate === 'manage'))('$name uses requireCapability(PACKAGES_MANAGE, allow) only', async ({ name, handler }) => {
    await call(handler, name.split(' ')[0])
    expect(h.requireCapability).toHaveBeenCalledTimes(1)
    expect(h.requireCapability).toHaveBeenCalledWith(expect.anything(), CAPABILITIES.PACKAGES_MANAGE, 'allow')
    expect(h.requireAdmin).not.toHaveBeenCalled()
  })

  it.each(cases.filter(c => c.gate === 'admin'))('$name uses requireAdmin only (no capability)', async ({ name, handler }) => {
    await call(handler, name.split(' ')[0])
    expect(h.requireAdmin).toHaveBeenCalledTimes(1)
    expect(h.requireCapability).not.toHaveBeenCalled()
  })

  it('the gates are exactly: 3 view, 5 manage, 3 admin (approval has no capability)', () => {
    const by = (g: Gate) => cases.filter(c => c.gate === g).map(c => c.name).sort()
    expect(by('view')).toEqual(['GET packages', 'GET packages/[id]', 'GET versions/[versionId]'])
    expect(by('manage')).toHaveLength(5)
    expect(by('admin')).toEqual(['PATCH packages/[id]', 'POST versions/[versionId]/approve', 'POST versions/[versionId]/request-changes'])
  })
})
