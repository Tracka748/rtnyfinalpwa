import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requireCapability: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))
vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireUser: h.requireUser, requireAdmin: h.requireAdmin, requireCapability: h.requireCapability }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase } from '@/lib/test-support/fake-supabase'
import * as listRoute from './route'
import * as docRoute from './[key]/route'
import * as previewRoute from './[key]/preview/route'
import * as createRoute from './[key]/requests/route'
import * as ownListRoute from '../theme-package-requests/route'
import * as ownDetailRoute from '../theme-package-requests/[id]/route'

const KEY = 'spooky_birthday'
const ID = '11111111-1111-1111-1111-111111111111'

type Ctx = { params: Promise<{ key: string; id: string }> }
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>

const publicCases: Array<{ name: string; handler: Handler; method: string }> = [
  { name: 'GET theme-packages', handler: listRoute.GET, method: 'GET' },
  { name: 'GET theme-packages/[key]', handler: docRoute.GET, method: 'GET' },
  { name: 'POST theme-packages/[key]/preview', handler: previewRoute.POST, method: 'POST' },
]
const userCases: Array<{ name: string; handler: Handler; method: string }> = [
  { name: 'POST theme-packages/[key]/requests', handler: createRoute.POST, method: 'POST' },
  { name: 'GET theme-package-requests', handler: ownListRoute.GET, method: 'GET' },
  { name: 'GET theme-package-requests/[id]', handler: ownDetailRoute.GET, method: 'GET' },
]

const modules: Record<string, Record<string, unknown>> = {
  'theme-packages/route': listRoute,
  'theme-packages/[key]/route': docRoute,
  'theme-packages/[key]/preview/route': previewRoute,
  'theme-packages/[key]/requests/route': createRoute,
  'theme-package-requests/route': ownListRoute,
  'theme-package-requests/[id]/route': ownDetailRoute,
}
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const call = (c: { handler: Handler; method: string }) =>
  c.handler(
    new NextRequest('http://localhost/api/test', { method: c.method, body: c.method === 'GET' ? undefined : '{}', headers: { 'content-type': 'application/json' } }),
    { params: Promise.resolve({ key: KEY, id: ID }) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('public routes need no auth', () => {
  it.each(publicCases)('$name never calls requireUser / requireAdmin / requireCapability', async c => {
    h.createSupabaseAdmin.mockReturnValue(fakeSupabase({ respond: () => ({ data: null, error: null }) }).client)
    await call(c)
    expect(h.requireUser).not.toHaveBeenCalled()
    expect(h.requireAdmin).not.toHaveBeenCalled()
    expect(h.requireCapability).not.toHaveBeenCalled()
  })
})

describe('customer routes require a signed-in user first', () => {
  for (const status of [401, 403]) {
    it.each(userCases)(`$name returns ${status} with no DB work and the body unread when requireUser denies`, async c => {
      h.requireUser.mockResolvedValue({
        error: true, userId: null,
        response: new Response(JSON.stringify({ success: false, error: 'denied' }), { status }),
      })
      const req = new NextRequest('http://localhost/api/test', { method: c.method, body: c.method === 'GET' ? undefined : '{}' })
      const res = await c.handler(req, { params: Promise.resolve({ key: KEY, id: ID }) })
      expect(res.status).toBe(status)
      expect(h.requireUser).toHaveBeenCalledTimes(1)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
      expect(req.bodyUsed).toBe(false)
      expect(h.requireAdmin).not.toHaveBeenCalled()
      expect(h.requireCapability).not.toHaveBeenCalled()
    })
  }
})

describe('coverage', () => {
  it('the case tables cover every exported HTTP handler (no handler can be added untested)', () => {
    const exported = Object.entries(modules).flatMap(([file, mod]) =>
      Object.keys(mod).filter(k => HTTP_METHODS.includes(k)).map(k => `${k} ${file}`)
    )
    const all = [...publicCases, ...userCases]
    expect(exported).toHaveLength(all.length)
    expect(new Set(all.map(c => c.handler)).size).toBe(all.length)
  })
})
