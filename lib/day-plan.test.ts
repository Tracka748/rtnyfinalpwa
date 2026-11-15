import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  ALLOWED, DAY_PLAN_LIMITS, DAY_PLAN_SAVED_STATUS, attachBusinessImages, businessImageMap, buildPayloadFromEnriched, buildPayloadFromPending,
  normalizeSavedPlans, parseSaveBody, safeImageUrl, toHHMM, toInsertRow, type SavePayload,
} from '@/lib/day-plan'
import { BUDGET_OPTIONS, ENERGY_OPTIONS, GROUP_OPTIONS, TAGS, TRANSPORT_OPTIONS } from '@/lib/day-plan-options'

const NOW = new Date('2026-11-15T12:00:00Z')
const BIZ = '11111111-1111-4111-8111-111111111111'

const stop = (o: Record<string, unknown> = {}) => ({
  business_id: BIZ, name: 'Cafe', category: 'cafe', address: '1 Main St',
  estimated_arrival: '12:30', duration_minutes: 60, estimated_spend: 20, segment: 'afternoon', ...o,
})
const body = (o: Record<string, unknown> = {}) => ({
  plan_date: '2026-11-20', stops: [stop()], budget: 'Under $50', energy_type: 'relaxed',
  group_type: ['solo'], tags: ['food'], time_start: '12:00', time_end: '23:00', transportation: 'car', ...o,
})
const parse = (o: Record<string, unknown> = {}) => parseSaveBody(JSON.stringify(body(o)), NOW)
const err = (o: Record<string, unknown>) => { const r = parse(o); return r.ok ? null : r.error }

describe('parseSaveBody', () => {
  it('accepts a valid plan', () => {
    const r = parse()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.stops[0]).toEqual({ ...stop(), business_id: BIZ })
  })

  it('rejects non-JSON, non-objects and unknown fields, including client user_id, id, totals and status', () => {
    expect(parseSaveBody('nope', NOW).ok).toBe(false)
    expect(parseSaveBody('[]', NOW).ok).toBe(false)
    for (const k of ['user_id', 'id', 'total_estimated_spend', 'total_duration_minutes', 'status', 'stopsx']) {
      expect(err({ [k]: 'x' }), k).toBe('body has unknown fields')
    }
    expect(err({ stops: [stop({ logo_url: 'https://evil' })] })).toMatch(/unknown fields/)
    expect(err({ stops: [stop({ cover_image_url: 'https://evil' })] })).toMatch(/unknown fields/)
  })

  it('caps the body size', () => {
    const big = JSON.stringify(body({ stops: [stop({ address: 'x'.repeat(40000) })] }))
    const r = parseSaveBody(big, NOW)
    expect(r.ok ? null : r.error).toBe('body is too large')
  })

  it('validates plan_date as a real date inside the window', () => {
    expect(err({ plan_date: '2026-02-30' })).toMatch(/real/)
    expect(err({ plan_date: '20261120' })).toMatch(/real/)
    expect(err({ plan_date: '2026-11-12' })).toMatch(/out of range/)
    expect(err({ plan_date: '2026-11-13' })).toBeNull()
    expect(err({ plan_date: '2027-11-16' })).toBeNull()
    expect(err({ plan_date: '2027-11-17' })).toMatch(/out of range/)
  })

  it('requires 1 to 15 stops', () => {
    expect(err({ stops: [] })).toMatch(/1 to 15/)
    expect(err({ stops: Array.from({ length: 16 }, () => stop()) })).toMatch(/1 to 15/)
    expect(err({ stops: Array.from({ length: 15 }, () => stop()) })).toBeNull()
    expect(err({ stops: 'x' })).toMatch(/1 to 15/)
  })

  it('validates and caps each stop field', () => {
    expect(err({ stops: [stop({ business_id: 'not-a-uuid' })] })).toMatch(/uuid/)
    expect(err({ stops: [stop({ business_id: null })] })).toBeNull()
    expect(err({ stops: [stop({ name: '' })] })).toMatch(/name is required/)
    expect(err({ stops: [stop({ name: 'x'.repeat(121) })] })).toMatch(/too long/)
    expect(err({ stops: [stop({ category: 'x'.repeat(51) })] })).toMatch(/too long/)
    expect(err({ stops: [stop({ address: 'x'.repeat(201) })] })).toMatch(/too long/)
    expect(err({ stops: [stop({ name: 'a\u0000b' })] })).toMatch(/invalid characters/)
    expect(err({ stops: [stop({ estimated_arrival: '25:00' })] })).toMatch(/HH:MM/)
    expect(err({ stops: [stop({ estimated_arrival: null })] })).toBeNull()
    expect(err({ stops: [stop({ estimated_spend: -1 })] })).toMatch(/out of range/)
    expect(err({ stops: [stop({ estimated_spend: 5001 })] })).toMatch(/out of range/)
    expect(err({ stops: [stop({ estimated_spend: '20' })] })).toMatch(/out of range/)
    expect(err({ stops: [stop({ duration_minutes: 1441 })] })).toMatch(/out of range/)
    expect(err({ stops: [stop({ duration_minutes: 1.5 })] })).toMatch(/whole/)
    expect(err({ stops: [stop({ segment: 'morning' })] })).toMatch(/not allowed/)
  })

  it('applies the allowlists', () => {
    expect(err({ budget: '$1,000,000' })).toMatch(/not allowed/)
    expect(err({ energy_type: 'chaotic' })).toMatch(/not allowed/)
    expect(err({ transportation: 'jetpack' })).toMatch(/not allowed/)
    expect(err({ group_type: ['robots'] })).toMatch(/not allowed/)
    expect(err({ tags: ['<script>'] })).toMatch(/not allowed/)
    expect(err({ tags: Array.from({ length: ALLOWED.tags.length + 1 }, () => 'food') })).toMatch(/short list/)
    expect(err({ budget: '', energy_type: null, transportation: undefined })).toBeNull()
  })

  it('de-duplicates lists', () => {
    const r = parse({ tags: ['food', 'food'], group_type: ['solo', 'solo'] })
    expect(r.ok && r.value.tags).toEqual(['food'])
    expect(r.ok && r.value.group_type).toEqual(['solo'])
  })
})

describe('allowlists cannot drift from the planner UI', () => {
  it('every option the UI offers is accepted, and nothing else is in the allowlists', () => {
    expect(ALLOWED.budget).toEqual(BUDGET_OPTIONS.map(o => o.label))
    expect(ALLOWED.energy).toEqual(ENERGY_OPTIONS.map(o => o.value))
    expect(ALLOWED.group).toEqual(GROUP_OPTIONS.map(o => o.value))
    expect(ALLOWED.tags).toEqual(TAGS.map(o => o.value))
    expect(ALLOWED.transport).toEqual(TRANSPORT_OPTIONS.map(o => o.value))
    for (const b of BUDGET_OPTIONS) expect(err({ budget: b.label }), b.label).toBeNull()
    for (const e of ENERGY_OPTIONS) expect(err({ energy_type: e.value })).toBeNull()
    for (const t of TRANSPORT_OPTIONS) expect(err({ transportation: t.value })).toBeNull()
    expect(err({ group_type: GROUP_OPTIONS.map(o => o.value), tags: TAGS.map(o => o.value) })).toBeNull()
  })

  it('PlanMyDay imports the option lists and does not define its own', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components/custom/plan/PlanMyDay.tsx'), 'utf8')
    expect(src).toMatch(/from '@\/lib\/day-plan-options'/)
    for (const name of ['BUDGET_OPTIONS', 'TAGS', 'ENERGY_OPTIONS', 'GROUP_OPTIONS', 'TRANSPORT_OPTIONS']) {
      expect(src, name).not.toMatch(new RegExp(`const ${name}\\s*=`))
    }
  })
})

describe('toInsertRow', () => {
  it('uses the given user id, recomputes totals and stores the nested shape with business_id only', () => {
    const r = parse({ stops: [stop({ estimated_spend: 10.005 }), stop({ estimated_spend: 5, duration_minutes: 30 })] })
    if (!r.ok) throw new Error(r.error)
    const row = toInsertRow('user-1', r.value)
    expect(row.user_id).toBe('user-1')
    expect(row.total_estimated_spend).toBe(15.01)
    expect(row.total_duration_minutes).toBe(90)
    expect(row.group_type).toBe('solo')
    expect(row.stops[0]).toEqual({
      stop: { business_id: BIZ, name: 'Cafe', category: 'cafe', address: '1 Main St', estimated_arrival: '12:30', duration_minutes: 60, estimated_spend: 10.01 },
      segment: 'afternoon',
      locked: false,
    })
    expect(Object.keys(row)).not.toContain('id')
    expect(row.status).toBe('saved')
    expect(JSON.stringify(row)).not.toMatch(/logo|cover|offer/)
  })

  it('matches the live day_plans schema (NOT NULL columns, status check, column types)', () => {
    const r = parse({ group_type: ['solo', 'pet'], time_start: '09:05', time_end: '23:59' })
    if (!r.ok) throw new Error(r.error)
    const row = toInsertRow('u', r.value)
    // day_plans_status_check allows only these values.
    expect(['generated', 'saved', 'completed']).toContain(row.status)
    expect(DAY_PLAN_SAVED_STATUS).toBe('saved')
    // stops is jsonb NOT NULL; id is NOT NULL with a default and is never sent.
    expect(Array.isArray(row.stops)).toBe(true)
    expect(row).not.toHaveProperty('id')
    // time columns: HH:MM or null; group_type: comma-separated text or null; tags: a text array.
    expect(row.time_start).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
    expect(row.time_end).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
    expect(row.group_type).toBe('solo,pet')
    expect(Array.isArray(row.tags) && row.tags.every(t => typeof t === 'string')).toBe(true)
    expect(Number.isInteger(row.total_duration_minutes)).toBe(true)
    expect(row.plan_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const empty = parse({ time_start: null, time_end: '', tags: [], group_type: [] })
    if (!empty.ok) throw new Error(empty.error)
    const e = toInsertRow('u', empty.value)
    expect([e.time_start, e.time_end, e.group_type]).toEqual([null, null, null])
    expect(e.tags).toEqual([])
  })

  it('rejects time values Postgres would misread or that are not HH:MM', () => {
    for (const t of ['24:00', '9:05', '09:5', '09:05:00', '12:00 PM', 'noon', 905]) {
      expect(err({ time_start: t }), String(t)).toMatch(/HH:MM/)
    }
  })

  it('stores an empty group list as null', () => {
    const r = parse({ group_type: [] })
    if (!r.ok) throw new Error(r.error)
    expect(toInsertRow('u', r.value).group_type).toBeNull()
  })
})

describe('toHHMM', () => {
  it('converts 12-hour and keeps 24-hour times', () => {
    expect(toHHMM('14:05')).toBe('14:05')
    expect(toHHMM('2:05 PM')).toBe('14:05')
    expect(toHHMM('12:00 AM')).toBe('00:00')
    expect(toHHMM('12:30 pm')).toBe('12:30')
    expect(toHHMM('9:30')).toBe('09:30')
    expect(toHHMM('13:00 PM')).toBeNull()
    expect(toHHMM('noon')).toBeNull()
    expect(toHHMM(7)).toBeNull()
  })
})

describe('payload builders', () => {
  const form = { timeStart: '12:00', timeEnd: '23:00', budget: '', energyType: 'active', tags: ['food'], groupType: ['solo', 'pet'], transportation: 'car' }

  it('builder payload drops image fields and validates', () => {
    const enriched = [{
      stop: { business_id: BIZ, name: 'Cafe', category: 'cafe', address: null, estimated_arrival: '18:00', duration_minutes: 45, estimated_spend: 12,
        logo_url: 'https://x/logo.png', cover_image_url: 'https://x/c.png', brand_color: '#fff', offer: null },
      segment: 'evening', locked: true,
    }]
    const p = buildPayloadFromEnriched(enriched, form, '2026-11-20')
    expect(JSON.stringify(p)).not.toMatch(/logo|cover|brand|offer|locked/)
    expect(p.budget).toBeNull()
    expect(parseSaveBody(JSON.stringify(p), NOW).ok).toBe(true)
  })

  it('confirm payload converts the flat sessionStorage shape and validates', () => {
    const pending = {
      date: '2026-11-20',
      stops: [{ businessId: BIZ, name: 'Bar', category: 'bar', time: '9:15 PM', address: '', estimatedSpend: 30, durationMinutes: 90, segment: 'night' }],
      preferences: { groupType: ['friends'], tags: ['night'], budget: '$50–$100', energyType: 'active', transportation: 'walking' },
    }
    const p = buildPayloadFromPending(pending)
    expect(p.stops[0]).toEqual({ business_id: BIZ, name: 'Bar', category: 'bar', address: null, estimated_arrival: '21:15', duration_minutes: 90, estimated_spend: 30, segment: 'night' })
    expect(parseSaveBody(JSON.stringify(p), NOW).ok).toBe(true)
  })

  it('curated plans without a business id or segment still validate', () => {
    const p = buildPayloadFromPending({ date: '2026-11-15', stops: [{ name: 'Gallery', category: 'venue', time: 'evening', estimatedSpend: 0, durationMinutes: 90 }] })
    expect(p.stops[0].business_id).toBeNull()
    expect(p.stops[0].estimated_arrival).toBeNull()
    expect(parseSaveBody(JSON.stringify(p), NOW).ok).toBe(true)
  })

  it('a tampered sessionStorage plan is rejected by validation, not trusted', () => {
    const p = buildPayloadFromPending({ date: '2026-11-15', stops: [{ name: 'X', category: 'bar', time: '9:00 PM', estimatedSpend: 1e9, durationMinutes: 60 }] })
    expect(parseSaveBody(JSON.stringify(p), NOW).ok).toBe(false)
  })
})

describe('normalizeSavedPlans', () => {
  it('handles the nested shape, the old flat shape and junk without throwing', () => {
    const rows = [
      { id: 'a', plan_date: '2026-05-20', total_estimated_spend: '42.5', total_duration_minutes: 120, created_at: 'x',
        stops: [{ stop: { business_id: BIZ, name: 'Cafe', category: 'cafe', address: null, estimated_arrival: '12:00', estimated_spend: 10, logo_url: 'https://client/logo' }, segment: 'afternoon' }] },
      { id: 'b', plan_date: null, stops: [{ name: 'Bar', category: 'bar', time: '9:00 PM', estimatedSpend: 30 }, null, 7, { stop: {} }] },
      { id: 'c', stops: 'garbage' },
      { notAnId: true },
      null,
    ]
    const out = normalizeSavedPlans(rows)
    expect(out.map(p => p.id)).toEqual(['a', 'b', 'c'])
    expect(out[0].total_estimated_spend).toBe(42.5)
    expect(out[0].stops[0]).toEqual({ business_id: BIZ, name: 'Cafe', category: 'cafe', address: null, time: '12:00', spend: 10, logo_url: null, cover_image_url: null })
    expect(out[1].stops).toEqual([{ business_id: null, name: 'Bar', category: 'bar', address: null, time: '21:00', spend: 30, logo_url: null, cover_image_url: null }])
    expect(out[2].stops).toEqual([])
    expect(normalizeSavedPlans(null)).toEqual([])
  })

  it('never carries an image URL over from plan data, whatever the stored shape', () => {
    const planned = [{
      id: 'a',
      stops: [
        { stop: { business_id: BIZ, name: 'Nested', logo_url: 'https://client/l', cover_image_url: 'https://client/c', image: 'https://client/i' } },
        { name: 'Flat', logo_url: 'https://client/l', cover_image_url: 'https://client/c', coverImageUrl: 'https://client/c2' },
      ],
    }]
    const out = normalizeSavedPlans(planned)
    expect(JSON.stringify(out)).not.toContain('client')
    // Even after the merge, a stop with no lookup entry stays imageless.
    expect(JSON.stringify(attachBusinessImages(out, new Map()))).not.toContain('client')
  })
})

describe('business image merge (logo and cover)', () => {
  const OTHER = '22222222-2222-4222-8222-222222222222'
  const NOLOOK = '33333333-3333-4333-8333-333333333333'
  const plans = () => normalizeSavedPlans([{
    id: 'a',
    stops: [
      { stop: { business_id: BIZ, name: 'Both' } },
      { stop: { business_id: OTHER, name: 'Logo only' } },
      { stop: { business_id: NOLOOK, name: 'Not in lookup' } },
      { name: 'No business id' },
    ],
  }])

  it('sets cover and logo when present, null when missing', () => {
    const map = businessImageMap([
      { id: BIZ, logo_url: 'https://cdn/logo.png', cover_image_url: 'https://cdn/cover.jpg' },
      { id: OTHER, logo_url: 'https://cdn/l2.png', cover_image_url: null },
    ])
    const s = attachBusinessImages(plans(), map)[0].stops
    expect(s.map(x => [x.logo_url, x.cover_image_url])).toEqual([
      ['https://cdn/logo.png', 'https://cdn/cover.jpg'],
      ['https://cdn/l2.png', null],
      [null, null],
      [null, null],
    ])
  })

  it('ignores non-http(s) URLs and rows without a valid id', () => {
    const map = businessImageMap([
      { id: BIZ, logo_url: 'javascript:alert(1)', cover_image_url: 'data:image/png;base64,AA' },
      { id: OTHER, logo_url: 'ftp://x/l.png', cover_image_url: 'https://cdn/ok.jpg' },
      { id: 'not-a-uuid', logo_url: 'https://cdn/x.png' },
      null,
    ])
    expect(map.has(BIZ)).toBe(false)
    expect(map.get(OTHER)).toEqual({ logo_url: null, cover_image_url: 'https://cdn/ok.jpg' })
    expect(map.size).toBe(1)
    const s = attachBusinessImages(plans(), map)[0].stops
    expect(s[0]).toMatchObject({ logo_url: null, cover_image_url: null })
    expect(s[1]).toMatchObject({ logo_url: null, cover_image_url: 'https://cdn/ok.jpg' })
  })

  it('matches business ids case-insensitively', () => {
    const map = businessImageMap([{ id: BIZ.toUpperCase(), logo_url: 'https://cdn/l.png' }])
    expect(attachBusinessImages(plans(), map)[0].stops[0].logo_url).toBe('https://cdn/l.png')
  })

  it('safeImageUrl accepts only http(s)', () => {
    expect(safeImageUrl('https://cdn/x.png')).toBe('https://cdn/x.png')
    expect(safeImageUrl('javascript:alert(1)')).toBeNull()
    expect(safeImageUrl('data:image/png;base64,AA')).toBeNull()
    expect(safeImageUrl('')).toBeNull()
    expect(safeImageUrl(null)).toBeNull()
  })
})

// Typed check that DAY_PLAN_LIMITS match the decisions (50 plans, 15 stops).
const _limits: [50, 15] = [DAY_PLAN_LIMITS.PLANS_PER_USER, DAY_PLAN_LIMITS.STOPS_MAX]
void _limits
void ({} as SavePayload)
