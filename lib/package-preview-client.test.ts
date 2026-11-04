import { describe, expect, it, vi } from 'vitest'
import { createLatestGate, fetchPreview, parseLiveDocumentResponse } from '@/lib/package-preview-client'
import type { PublicSnapshot } from '@/lib/theme-package-public'

const SNAPSHOT: PublicSnapshot = { guest_count: 20, event_date: null, items: [], excluded: [], listed_subtotal: 100, unpriced_items: 1 }
const BODY = { selection: { components: [{ component_id: 'c1', included: true }] }, guest_count: 20 }

function fakeFetch(status: number, json: unknown, rawBody?: string) {
  return vi.fn(async () => new Response(rawBody ?? JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('fetchPreview: request', () => {
  it('POSTs only the selection and guest count to the preview route for this package', async () => {
    const f = fakeFetch(200, { success: true, data: SNAPSHOT })
    const signal = new AbortController().signal
    await fetchPreview(f, 'spooky_birthday', BODY, signal)
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/theme-packages/spooky_birthday/preview')
    expect(init.method).toBe('POST')
    expect(init.signal).toBe(signal)
    expect(JSON.parse(String(init.body))).toEqual(BODY)
    expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual(['guest_count', 'selection'])
  })
  it('encodes the key into the path', async () => {
    const f = fakeFetch(200, { success: true, data: SNAPSHOT })
    await fetchPreview(f, 'a/b?c', BODY)
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/api/v1/theme-packages/a%2Fb%3Fc/preview')
  })
})

describe('fetchPreview: responses', () => {
  it('200 with a snapshot -> ok', async () => {
    expect(await fetchPreview(fakeFetch(200, { success: true, data: SNAPSHOT }), 'k', BODY)).toEqual({ kind: 'ok', snapshot: SNAPSHOT })
  })
  it('400 -> rejected with the server message (trimmed to 200 characters)', async () => {
    expect(await fetchPreview(fakeFetch(400, { success: false, error: 'required component "Cake" cannot be removed' }), 'k', BODY)).toEqual({
      kind: 'rejected', message: 'required component "Cake" cannot be removed',
    })
    const long = await fetchPreview(fakeFetch(400, { success: false, error: 'x'.repeat(500) }), 'k', BODY)
    expect(long.kind === 'rejected' && long.message.length).toBe(200)
    expect(await fetchPreview(fakeFetch(400, {}), 'k', BODY)).toEqual({ kind: 'rejected', message: '' })
  })
  it('404 -> not_found', async () => {
    expect(await fetchPreview(fakeFetch(404, { success: false, error: 'Package not found' }), 'k', BODY)).toEqual({ kind: 'not_found' })
  })
  it('other statuses -> unavailable', async () => {
    for (const status of [401, 429, 500, 502]) {
      expect(await fetchPreview(fakeFetch(status, { success: false, error: 'x' }), 'k', BODY)).toEqual({ kind: 'unavailable' })
    }
  })
  it('a network error or abort -> unavailable', async () => {
    const failing = vi.fn(async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await fetchPreview(failing, 'k', BODY)).toEqual({ kind: 'unavailable' })
  })
  it('malformed JSON, success:false or a wrong shape on a 200 -> unavailable', async () => {
    expect(await fetchPreview(fakeFetch(200, null, '{nope'), 'k', BODY)).toEqual({ kind: 'unavailable' })
    expect(await fetchPreview(fakeFetch(200, { success: false, data: SNAPSHOT }), 'k', BODY)).toEqual({ kind: 'unavailable' })
    expect(await fetchPreview(fakeFetch(200, { success: true, data: { ...SNAPSHOT, items: 'x' } }), 'k', BODY)).toEqual({ kind: 'unavailable' })
    expect(await fetchPreview(fakeFetch(200, { success: true, data: { ...SNAPSHOT, listed_subtotal: '100' } }), 'k', BODY)).toEqual({ kind: 'unavailable' })
    expect(await fetchPreview(fakeFetch(200, { success: true }), 'k', BODY)).toEqual({ kind: 'unavailable' })
  })
  it('accepts a snapshot with null totals', async () => {
    const s = { ...SNAPSHOT, listed_subtotal: null, unpriced_items: null }
    expect((await fetchPreview(fakeFetch(200, { success: true, data: s }), 'k', BODY)).kind).toBe('ok')
  })
})

describe('createLatestGate', () => {
  it('only the most recently started request is current', () => {
    const gate = createLatestGate()
    const a = gate.begin()
    expect(gate.isCurrent(a)).toBe(true)
    const b = gate.begin()
    expect(gate.isCurrent(a)).toBe(false) // an older, slower response is ignored
    expect(gate.isCurrent(b)).toBe(true)
    expect(b).toBeGreaterThan(a)
  })
  it('gates are independent', () => {
    const g1 = createLatestGate()
    const g2 = createLatestGate()
    const t1 = g1.begin()
    g2.begin()
    g2.begin()
    expect(g1.isCurrent(t1)).toBe(true)
  })
})

describe('parseLiveDocumentResponse', () => {
  const valid = {
    key: 'spooky', occasion: 'Birthday', theme: null, version_id: 'v1', requestable: true,
    meta: { title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: null, max_guests: null, published_at: null },
    components: [{ id: 'c1', slot_label: 'Cake', requirement: 'required', quantity: 1, notes: null, available: true, options: [] }],
  }
  it('returns the document for a well-formed response', () => {
    expect(parseLiveDocumentResponse({ success: true, data: valid })).toEqual(valid)
  })
  it.each([
    ['null', null],
    ['success false', { success: false, data: valid }],
    ['no data', { success: true }],
    ['data not an object', { success: true, data: 'x' }],
    ['no key', { success: true, data: { ...valid, key: undefined } }],
    ['no version_id', { success: true, data: { ...valid, version_id: 5 } }],
    ['no meta title', { success: true, data: { ...valid, meta: {} } }],
    ['requestable missing', { success: true, data: { ...valid, requestable: 'yes' } }],
    ['components not an array', { success: true, data: { ...valid, components: {} } }],
    ['component without options', { success: true, data: { ...valid, components: [{ id: 'c1', slot_label: 'Cake', requirement: 'required' }] } }],
  ])('rejects %s', (_name, json) => {
    expect(parseLiveDocumentResponse(json)).toBeNull()
  })
})
