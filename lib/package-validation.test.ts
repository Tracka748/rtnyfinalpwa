import { describe, expect, it } from 'vitest'
import {
  validateApprove, validateCreatePackage, validatePackageListQuery, validatePackagePatch,
  validateRequestChanges, validateRevisionBody, validateSaveDraft,
} from '@/lib/package-validation'

const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const U3 = '33333333-3333-3333-3333-333333333333'
const U4 = '44444444-4444-4444-4444-444444444444'
const err = (r: { ok: boolean }) => (r as { ok: false; error: string }).error
const save = (body: Record<string, unknown>) => validateSaveDraft({ expected_revision: 1, ...body })
const comp = (extra: Record<string, unknown> = {}) => ({ slot_label: 'Cake', ...extra })
const opt = (extra: Record<string, unknown> = {}) => ({ catalog_item_id: U1, ...extra })

describe('validateCreatePackage', () => {
  const base = { key: 'spooky_birthday', occasion: 'Birthday', title: 'Spooky Birthday' }
  it('accepts a minimal body (theme_id defaults to null)', () => {
    expect(validateCreatePackage(base)).toEqual({ ok: true, value: { ...base, theme_id: null } })
  })
  it('accepts and lowercases a theme_id', () => {
    expect(validateCreatePackage({ ...base, theme_id: U1.toUpperCase() })).toEqual({ ok: true, value: { ...base, theme_id: U1 } })
    expect(validateCreatePackage({ ...base, theme_id: null }).ok).toBe(true)
  })
  it.each(['Spooky', '1abc', 'a-b', '', '_a', 'a'.repeat(65)])('rejects invalid key %j', key => {
    expect(validateCreatePackage({ ...base, key }).ok).toBe(false)
  })
  it('enforces occasion (1-60) and title (1-120)', () => {
    expect(validateCreatePackage({ ...base, occasion: 'x'.repeat(60) }).ok).toBe(true)
    expect(validateCreatePackage({ ...base, occasion: 'x'.repeat(61) }).ok).toBe(false)
    expect(validateCreatePackage({ ...base, occasion: '  ' }).ok).toBe(false)
    expect(validateCreatePackage({ ...base, title: 'x'.repeat(120) }).ok).toBe(true)
    expect(validateCreatePackage({ ...base, title: 'x'.repeat(121) }).ok).toBe(false)
    expect(validateCreatePackage({ ...base, title: '' }).ok).toBe(false)
  })
  it('rejects a bad theme_id and unknown keys (including server-owned ones)', () => {
    expect(validateCreatePackage({ ...base, theme_id: 'nope' }).ok).toBe(false)
    for (const extra of ['created_by', 'status', 'live_version_id', 'id']) {
      expect(validateCreatePackage({ ...base, [extra]: 'x' }).ok).toBe(false)
    }
  })
  it.each([null, [], 'x', 5, undefined])('rejects non-object body %j', body => {
    expect(validateCreatePackage(body).ok).toBe(false)
  })
})

describe('validatePackagePatch / validatePackageListQuery', () => {
  it('only accepts status active|archived', () => {
    expect(validatePackagePatch({ status: 'archived' })).toEqual({ ok: true, value: { status: 'archived' } })
    expect(validatePackagePatch({ status: 'deleted' }).ok).toBe(false)
    expect(validatePackagePatch({}).ok).toBe(false)
    expect(validatePackagePatch({ status: 'active', key: 'x' }).ok).toBe(false)
    expect(validatePackagePatch({ status: 'active', live_version_id: U1 }).ok).toBe(false)
  })
  it('validates list filter and offset', () => {
    expect(validatePackageListQuery(new URLSearchParams('status=active&offset=20'))).toEqual({ ok: true, value: { status: 'active', offset: 20 } })
    expect(validatePackageListQuery(new URLSearchParams(''))).toEqual({ ok: true, value: { offset: 0 } })
    for (const qs of ['status=draft', 'offset=-1', 'offset=1.5', 'offset=10001', 'offset=abc']) {
      expect(validatePackageListQuery(new URLSearchParams(qs)).ok).toBe(false)
    }
    expect(validatePackageListQuery(new URLSearchParams('offset=10000')).ok).toBe(true)
  })
})

describe('transition bodies', () => {
  it('requires an integer expected_revision >= 1', () => {
    expect(validateRevisionBody({ expected_revision: 3 })).toEqual({ ok: true, value: { expected_revision: 3 } })
    for (const rev of [undefined, null, 0, -1, 1.5, '3', NaN, 2147483648, true]) {
      expect(validateRevisionBody({ expected_revision: rev }).ok).toBe(false)
    }
    expect(validateRevisionBody({}).ok).toBe(false)
  })
  it('rejects actor-like keys', () => {
    for (const k of ['actor', 'updated_by', 'reviewed_by', 'user_id', 'role', 'status']) {
      expect(validateRevisionBody({ expected_revision: 1, [k]: U1 }).ok).toBe(false)
    }
  })
  it('approve: note is optional (blank -> null) and capped at 2000', () => {
    expect(validateApprove({ expected_revision: 2 })).toEqual({ ok: true, value: { expected_revision: 2, note: null } })
    expect(validateApprove({ expected_revision: 2, note: '  ' })).toEqual({ ok: true, value: { expected_revision: 2, note: null } })
    expect(validateApprove({ expected_revision: 2, note: 'x'.repeat(2000) }).ok).toBe(true)
    expect(validateApprove({ expected_revision: 2, note: 'x'.repeat(2001) }).ok).toBe(false)
    expect(validateApprove({ expected_revision: 2, reviewed_by: U1 }).ok).toBe(false)
    expect(validateApprove({ note: 'ok' }).ok).toBe(false)
  })
  it('request-changes: note is required (1-2000)', () => {
    expect(validateRequestChanges({ expected_revision: 2, note: 'Fix the cake' })).toEqual({ ok: true, value: { expected_revision: 2, note: 'Fix the cake' } })
    for (const note of [undefined, null, '', '   ', 5, 'x'.repeat(2001)]) {
      expect(validateRequestChanges({ expected_revision: 2, note }).ok).toBe(false)
    }
    expect(validateRequestChanges({ expected_revision: 2, note: 'x'.repeat(2000) }).ok).toBe(true)
  })
})

describe('validateSaveDraft: envelope', () => {
  it('needs expected_revision and at least one of meta/components', () => {
    expect(validateSaveDraft({ meta: { title: 'x' } }).ok).toBe(false)
    expect(validateSaveDraft({ expected_revision: 1 }).ok).toBe(false)
    expect(err(validateSaveDraft({ expected_revision: 1 }))).toBe('Provide meta and/or components')
    expect(validateSaveDraft({ expected_revision: 1.5, meta: { title: 'x' } }).ok).toBe(false)
    expect(validateSaveDraft({ expected_revision: '1', meta: { title: 'x' } }).ok).toBe(false)
    expect(validateSaveDraft({ expected_revision: 0, meta: { title: 'x' } }).ok).toBe(false)
  })
  it('rejects unknown and actor-like top-level keys', () => {
    for (const k of ['actor', 'p_actor', 'actor_id', 'updated_by', 'user_id', 'role', 'status', 'revision']) {
      const r = save({ meta: { title: 'x' }, [k]: U1 })
      expect(r.ok).toBe(false)
      expect(err(r)).toContain('Unknown field')
    }
  })
  it.each([null, [], 'x', 5, undefined])('rejects non-object body %j', body => {
    expect(validateSaveDraft(body).ok).toBe(false)
  })
  it('rejects null / non-object meta and non-array components, and an empty meta', () => {
    expect(save({ meta: null }).ok).toBe(false)
    expect(save({ meta: [] }).ok).toBe(false)
    expect(save({ meta: {} }).ok).toBe(false)
    expect(save({ components: null }).ok).toBe(false)
    expect(save({ components: {} }).ok).toBe(false)
  })
  it('accepts an empty components array (removes them all)', () => {
    expect(save({ components: [] })).toEqual({ ok: true, value: { expected_revision: 1, components: [] } })
  })
})

describe('validateSaveDraft: meta', () => {
  const meta = (m: Record<string, unknown>) => save({ meta: m })
  it('accepts every field and returns only what was sent', () => {
    expect(meta({ title: ' Spooky ', subtitle: 'Sub', description: 'D', cover_image_url: 'https://x.com/a.png', magazine_url: 'https://x.com/m.pdf', price_note: 'From $500', min_guests: 5, max_guests: 20 })).toEqual({
      ok: true,
      value: { expected_revision: 1, meta: { title: 'Spooky', subtitle: 'Sub', description: 'D', cover_image_url: 'https://x.com/a.png', magazine_url: 'https://x.com/m.pdf', price_note: 'From $500', min_guests: 5, max_guests: 20 } },
    })
  })
  it('title: 1-120, never null', () => {
    expect(meta({ title: 'x'.repeat(120) }).ok).toBe(true)
    for (const title of ['x'.repeat(121), '', '  ', null, 5]) expect(meta({ title }).ok).toBe(false)
  })
  it('nullable text fields: limits, blank/null -> null', () => {
    expect(meta({ subtitle: 'x'.repeat(160) }).ok).toBe(true)
    expect(meta({ subtitle: 'x'.repeat(161) }).ok).toBe(false)
    expect(meta({ description: 'x'.repeat(4000) }).ok).toBe(true)
    expect(meta({ description: 'x'.repeat(4001) }).ok).toBe(false)
    expect(meta({ price_note: 'x'.repeat(200) }).ok).toBe(true)
    expect(meta({ price_note: 'x'.repeat(201) }).ok).toBe(false)
    expect(meta({ subtitle: null, description: '  ', price_note: null })).toEqual({
      ok: true, value: { expected_revision: 1, meta: { subtitle: null, description: null, price_note: null } },
    })
    expect(meta({ subtitle: 5 }).ok).toBe(false)
  })
  it('urls: https only, <= 2048, null/blank clears', () => {
    for (const field of ['cover_image_url', 'magazine_url']) {
      expect(meta({ [field]: 'https://cdn.example.com/a.png' }).ok).toBe(true)
      expect(meta({ [field]: null }).ok).toBe(true)
      expect(meta({ [field]: '' })).toEqual({ ok: true, value: { expected_revision: 1, meta: { [field]: null } } })
      for (const url of ['http://x.com/a', 'javascript:alert(1)', 'data:text/html,hi', 'ftp://x.com/a', '//x.com/a', 'not a url', 'https://u:p@x.com/a', 5]) {
        expect(meta({ [field]: url }).ok).toBe(false)
      }
      expect(meta({ [field]: 'https://x.com/' + 'a'.repeat(2048) }).ok).toBe(false)
    }
  })
  it('guest limits: integer 1-10000 or null; min <= max when both present', () => {
    expect(meta({ min_guests: 1, max_guests: 10000 }).ok).toBe(true)
    expect(meta({ min_guests: null, max_guests: null }).ok).toBe(true)
    for (const n of [0, 10001, -1, 1.5, '5', NaN]) {
      expect(meta({ min_guests: n }).ok).toBe(false)
      expect(meta({ max_guests: n }).ok).toBe(false)
    }
    expect(meta({ min_guests: 10, max_guests: 10 }).ok).toBe(true)
    const r = meta({ min_guests: 11, max_guests: 10 })
    expect(r.ok).toBe(false)
    expect(err(r)).toContain('min_guests cannot be greater than max_guests')
    expect(meta({ min_guests: 50, max_guests: null }).ok).toBe(true)
  })
  it('rejects unknown meta keys', () => {
    expect(meta({ title: 'x', status: 'approved' }).ok).toBe(false)
    expect(meta({ title: 'x', revision: 9 }).ok).toBe(false)
    expect(meta({ title: 'x', updated_by: U1 }).ok).toBe(false)
  })
})

describe('validateSaveDraft: components', () => {
  const comps = (c: unknown) => save({ components: c })
  it('applies defaults and normalises', () => {
    expect(comps([comp({ id: U1.toUpperCase() })])).toEqual({
      ok: true,
      value: { expected_revision: 1, components: [{ id: U1, slot_label: 'Cake', requirement: 'required', quantity: 1, notes: null }] },
    })
  })
  it('component limits: at most 30', () => {
    expect(comps(Array.from({ length: 30 }, (_, i) => comp({ slot_label: `S${i}` }))).ok).toBe(true)
    expect(comps(Array.from({ length: 31 }, (_, i) => comp({ slot_label: `S${i}` }))).ok).toBe(false)
  })
  it('slot_label 1-80', () => {
    expect(comps([comp({ slot_label: 'x'.repeat(80) })]).ok).toBe(true)
    for (const slot_label of ['x'.repeat(81), '', '  ', null, undefined, 5]) {
      expect(comps([comp({ slot_label })]).ok).toBe(false)
    }
  })
  it('requirement enum', () => {
    for (const requirement of ['required', 'optional_on', 'optional_off']) expect(comps([comp({ requirement })]).ok).toBe(true)
    expect(comps([comp({ requirement: 'maybe' })]).ok).toBe(false)
    expect(comps([comp({ requirement: null })]).ok).toBe(false)
  })
  it('quantity: integer 1-99', () => {
    expect(comps([comp({ quantity: 1 })]).ok).toBe(true)
    expect(comps([comp({ quantity: 99 })]).ok).toBe(true)
    for (const quantity of [0, 100, -1, 1.5, '2', null]) expect(comps([comp({ quantity })]).ok).toBe(false)
  })
  it('notes <= 500, blank/null -> null', () => {
    expect(comps([comp({ notes: 'x'.repeat(500) })]).ok).toBe(true)
    expect(comps([comp({ notes: 'x'.repeat(501) })]).ok).toBe(false)
    expect(comps([comp({ notes: '  ' })])).toEqual({
      ok: true,
      value: { expected_revision: 1, components: [{ slot_label: 'Cake', requirement: 'required', quantity: 1, notes: null }] },
    })
    expect(comps([comp({ notes: 5 })]).ok).toBe(false)
  })
  it('rejects bad ids, duplicate component ids, and sort_order / unknown keys', () => {
    expect(comps([comp({ id: 'nope' })]).ok).toBe(false)
    const dup = comps([comp({ id: U1 }), comp({ slot_label: 'B', id: U1.toUpperCase() })])
    expect(dup.ok).toBe(false)
    expect(err(dup)).toContain('duplicate component ids')
    expect(comps([comp({ sort_order: 1 })]).ok).toBe(false)
    expect(comps([comp({ version_id: U1 })]).ok).toBe(false)
    expect(comps(['x']).ok).toBe(false)
    expect(comps([null]).ok).toBe(false)
  })
  it('error messages name the failing component', () => {
    expect(err(comps([comp(), comp({ slot_label: '' })]))).toContain('components[1]')
  })

  describe('options', () => {
    const withOpts = (options: unknown) => comps([comp({ options })])
    it('omitted options key is left out of the output; empty array is kept', () => {
      const none = comps([comp()])
      expect(none.ok && 'options' in none.value.components![0]).toBe(false)
      const empty = withOpts([])
      expect(empty.ok && empty.value.components![0].options).toEqual([])
    })
    it('applies defaults (service_id null, is_default false) and lowercases ids', () => {
      expect(withOpts([opt({ id: U2.toUpperCase(), service_id: U3.toUpperCase(), is_default: true })])).toEqual({
        ok: true,
        value: { expected_revision: 1, components: [{ slot_label: 'Cake', requirement: 'required', quantity: 1, notes: null, options: [{ id: U2, catalog_item_id: U1, service_id: U3, is_default: true }] }] },
      })
      const r = withOpts([opt()])
      expect(r.ok && r.value.components![0].options).toEqual([{ catalog_item_id: U1, service_id: null, is_default: false }])
      expect(withOpts([opt({ service_id: null })]).ok).toBe(true)
    })
    it('at most 10 options', () => {
      expect(withOpts(Array.from({ length: 10 }, () => opt())).ok).toBe(true)
      expect(withOpts(Array.from({ length: 11 }, () => opt())).ok).toBe(false)
    })
    it('catalog_item_id is required and must be a uuid', () => {
      expect(withOpts([{}]).ok).toBe(false)
      expect(withOpts([opt({ catalog_item_id: 'nope' })]).ok).toBe(false)
      expect(withOpts([opt({ catalog_item_id: null })]).ok).toBe(false)
    })
    it('service_id must be a uuid or null; is_default must be boolean', () => {
      expect(withOpts([opt({ service_id: 'nope' })]).ok).toBe(false)
      expect(withOpts([opt({ service_id: 5 })]).ok).toBe(false)
      expect(withOpts([opt({ is_default: 'yes' })]).ok).toBe(false)
      expect(withOpts([opt({ is_default: 1 })]).ok).toBe(false)
    })
    it('rejects two defaults in one component but allows one default per component', () => {
      const two = withOpts([opt({ is_default: true }), opt({ is_default: true })])
      expect(two.ok).toBe(false)
      expect(err(two)).toContain('only one default')
      expect(comps([
        comp({ options: [opt({ is_default: true }), opt()] }),
        comp({ slot_label: 'B', options: [opt({ is_default: true })] }),
      ]).ok).toBe(true)
    })
    it('rejects duplicate option ids, within and across components', () => {
      const within = withOpts([opt({ id: U2 }), opt({ id: U2 })])
      expect(within.ok).toBe(false)
      expect(err(within)).toContain('duplicate option ids')
      expect(comps([comp({ options: [opt({ id: U2 })] }), comp({ slot_label: 'B', options: [opt({ id: U2 })] })]).ok).toBe(false)
      expect(comps([comp({ options: [opt({ id: U2 })] }), comp({ slot_label: 'B', options: [opt({ id: U4 })] })]).ok).toBe(true)
    })
    it('rejects bad option shapes and unknown option keys', () => {
      expect(withOpts('x').ok).toBe(false)
      expect(withOpts(null).ok).toBe(false)
      expect(withOpts(['x']).ok).toBe(false)
      expect(withOpts([opt({ sort_order: 1 })]).ok).toBe(false)
      expect(withOpts([opt({ component_id: U1 })]).ok).toBe(false)
      expect(withOpts([opt({ id: 'nope' })]).ok).toBe(false)
    })
    it('names the failing option', () => {
      expect(err(withOpts([opt(), opt({ catalog_item_id: 'x' })]))).toContain('components[0]: options[1]')
    })
  })
})
