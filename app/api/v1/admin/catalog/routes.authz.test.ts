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
import * as eligibleRoute from './eligible-services/route'
import * as itemsRoute from './items/route'
import * as itemRoute from './items/[id]/route'
import * as servicesRoute from './items/[id]/services/route'
import * as linkRoute from './items/[id]/services/[linkId]/route'
import * as themesRoute from './items/[id]/themes/route'

const ID = '11111111-1111-1111-1111-111111111111'
const LINK_ID = '22222222-2222-2222-2222-222222222222'

type Handler = (req: NextRequest, ctx: { params: Promise<{ id: string; linkId: string }> }) => Promise<Response>

const cases: Array<{ name: string; handler: Handler; helper: 'admin' | 'capability' }> = [
  { name: 'GET items', handler: itemsRoute.GET, helper: 'capability' },
  { name: 'POST items', handler: itemsRoute.POST, helper: 'admin' },
  { name: 'PATCH items/[id]', handler: itemRoute.PATCH, helper: 'admin' },
  { name: 'PUT items/[id]/themes', handler: themesRoute.PUT, helper: 'admin' },
  { name: 'GET items/[id]/services', handler: servicesRoute.GET, helper: 'capability' },
  { name: 'POST items/[id]/services', handler: servicesRoute.POST, helper: 'admin' },
  { name: 'PATCH items/[id]/services/[linkId]', handler: linkRoute.PATCH, helper: 'admin' },
  { name: 'GET eligible-services', handler: eligibleRoute.GET, helper: 'admin' },
]

const modules: Record<string, Record<string, unknown>> = {
  'items/route': itemsRoute,
  'items/[id]/route': itemRoute,
  'items/[id]/themes/route': themesRoute,
  'items/[id]/services/route': servicesRoute,
  'items/[id]/services/[linkId]/route': linkRoute,
  'eligible-services/route': eligibleRoute,
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

beforeEach(() => {
  vi.clearAllMocks()
  h.requireAdmin.mockImplementation(async () => denied())
  h.requireCapability.mockImplementation(async () => denied())
  h.requireUser.mockImplementation(async () => denied())
})

describe('catalog routes are gated before any work', () => {
  it('the case table covers every exported HTTP handler (no handler can be added untested)', () => {
    const exported = Object.entries(modules).flatMap(([file, mod]) =>
      Object.keys(mod).filter(k => HTTP_METHODS.includes(k)).map(k => `${k} ${file}`)
    )
    expect(exported).toHaveLength(cases.length)
  })

  it.each(cases)('$name returns 403 and never creates the admin client', async ({ handler }) => {
    const req = new Request('http://localhost/api/test', { method: 'POST', body: '{}' }) as unknown as NextRequest
    const res = await handler(req, { params: Promise.resolve({ id: ID, linkId: LINK_ID }) })
    expect(res.status).toBe(403)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })

  it.each(cases.filter(c => c.helper === 'admin'))('$name uses requireAdmin only', async ({ handler }) => {
    const req = new Request('http://localhost/api/test', { method: 'POST', body: '{}' }) as unknown as NextRequest
    await handler(req, { params: Promise.resolve({ id: ID, linkId: LINK_ID }) })
    expect(h.requireAdmin).toHaveBeenCalledTimes(1)
    expect(h.requireCapability).not.toHaveBeenCalled()
  })

  it.each(cases.filter(c => c.helper === 'capability'))(
    '$name uses requireCapability(CATALOG_VIEW, read_only) only',
    async ({ handler }) => {
      const req = new Request('http://localhost/api/test', { method: 'GET' }) as unknown as NextRequest
      await handler(req, { params: Promise.resolve({ id: ID, linkId: LINK_ID }) })
      expect(h.requireCapability).toHaveBeenCalledTimes(1)
      expect(h.requireCapability).toHaveBeenCalledWith(expect.anything(), CAPABILITIES.CATALOG_VIEW, 'read_only')
      expect(h.requireAdmin).not.toHaveBeenCalled()
    }
  )

  it('every non-GET handler and eligible-services GET is admin-gated; only the two item GETs use the capability', () => {
    const capability = cases.filter(c => c.helper === 'capability').map(c => c.name).sort()
    expect(capability).toEqual(['GET items', 'GET items/[id]/services'])
    for (const c of cases.filter(c => !c.name.startsWith('GET '))) expect(c.helper).toBe('admin')
    expect(cases.find(c => c.name === 'GET eligible-services')!.helper).toBe('admin')
  })
})
