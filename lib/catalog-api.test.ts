import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapDbError } from '@/lib/catalog-api'

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

async function run(err: unknown) {
  const res = mapDbError(err, 'test')
  return { status: res.status, body: await res.json() }
}

describe('mapDbError', () => {
  it('P0001 -> 400 with our trigger message', async () => {
    expect(await run({ code: 'P0001', message: 'promotional services (bogo/perk) cannot be linked to catalog items' }))
      .toEqual({ status: 400, body: { success: false, error: 'promotional services (bogo/perk) cannot be linked to catalog items' } })
  })
  it('RT409 -> 409 passing our own message through', async () => {
    expect(await run({ code: 'RT409', message: 'this draft was changed by someone else; reload it and try again' }))
      .toEqual({ status: 409, body: { success: false, error: 'this draft was changed by someone else; reload it and try again' } })
  })
  it('RT409 without a message -> 409 with the default text', async () => {
    expect(await run({ code: 'RT409' }))
      .toEqual({ status: 409, body: { success: false, error: 'This draft was changed by someone else; reload it and try again' } })
  })
  it('42501 -> 403 Forbidden without the DB message', async () => {
    expect(await run({ code: '42501', message: 'catalog items must be approved by an admin' }))
      .toEqual({ status: 403, body: { success: false, error: 'Forbidden' } })
  })
  it('23505 -> 409', async () => {
    expect((await run({ code: '23505', message: 'duplicate key value violates unique constraint "x"' })).status).toBe(409)
  })
  it('23503 and 23514 -> generic 400 that does not leak constraint names', async () => {
    for (const code of ['23503', '23514']) {
      const r = await run({ code, message: 'violates foreign key constraint "catalog_item_services_service_id_fkey"' })
      expect(r).toEqual({ status: 400, body: { success: false, error: 'Invalid request' } })
    }
  })
  it('anything else -> generic 500', async () => {
    for (const e of [{ code: 'XX000', message: 'internal detail' }, new Error('boom'), null, undefined, 'str']) {
      const r = await run(e)
      expect(r).toEqual({ status: 500, body: { success: false, error: 'Something went wrong' } })
    }
  })
})
