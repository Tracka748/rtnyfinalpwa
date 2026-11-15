import { describe, expect, it } from 'vitest'
import { saveDayPlanRequest, SAVE_MESSAGES } from '@/lib/day-plan-save-client'
import type { SavePayload } from '@/lib/day-plan'

const PAYLOAD: SavePayload = {
  plan_date: '2026-11-20', stops: [], budget: null, energy_type: null, group_type: [], tags: [],
  time_start: null, time_end: null, transportation: null,
}

const res = (status: number, json: () => Promise<unknown>) => async () => ({ status, ok: status >= 200 && status < 300, json })
const jsonRes = (status: number, body: unknown) => res(status, async () => body)

describe('saveDayPlanRequest', () => {
  it('posts the payload as JSON to the save route', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    await saveDayPlanRequest(PAYLOAD, async (url, init) => { seen.push({ url, init }); return { status: 200, ok: true, json: async () => ({ success: true, data: { id: 'p1' } }) } })
    expect(seen[0].url).toBe('/api/v1/plan/day/save')
    expect(seen[0].init?.method).toBe('POST')
    expect(JSON.parse(String(seen[0].init?.body))).toEqual(PAYLOAD)
  })

  it('returns saved only for a well-formed success body', async () => {
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(200, { success: true, data: { id: 'p1' } }))).toEqual({ status: 'saved', id: 'p1' })
  })

  it('treats a missing or malformed body as an error, never throwing', async () => {
    for (const body of [null, undefined, 'text', {}, { success: true }, { success: true, data: null }, { success: true, data: {} },
      { success: true, data: { id: 7 } }, { success: true, data: { id: '' } }, { success: false, data: { id: 'p1' } }]) {
      expect(await saveDayPlanRequest(PAYLOAD, jsonRes(200, body)), JSON.stringify(body)).toEqual({ status: 'error' })
    }
  })

  it('treats non-JSON as an error', async () => {
    expect(await saveDayPlanRequest(PAYLOAD, res(200, async () => { throw new SyntaxError('Unexpected token <') }))).toEqual({ status: 'error' })
  })

  it('treats a network failure as an error', async () => {
    expect(await saveDayPlanRequest(PAYLOAD, async () => { throw new TypeError('Load failed') })).toEqual({ status: 'error' })
    expect(await saveDayPlanRequest(PAYLOAD, async () => undefined as never)).toEqual({ status: 'error' })
  })

  it('maps statuses without reading server text', async () => {
    const leaky = { success: false, error: 'PGSECRET relation day_plans' }
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(401, leaky))).toEqual({ status: 'signed_out' })
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(429, leaky))).toEqual({ status: 'limit' })
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(409, leaky))).toEqual({ status: 'profile' })
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(500, leaky))).toEqual({ status: 'error' })
    expect(await saveDayPlanRequest(PAYLOAD, jsonRes(400, leaky))).toEqual({ status: 'error' })
  })

  it('user-facing messages are fixed text', () => {
    expect(Object.values(SAVE_MESSAGES).join(' ')).not.toMatch(/PG|postgres|relation|error:/i)
  })
})
