import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  AUTOSAVE_MS, SAVE_CONFLICT, SAVE_GENERIC, advanceBase, buildDraftBody, canSubmit, cloneForm, diffMeta,
  formFromVersion, heldSummary, initialEditorState, mergeConflict, pickField, planFromState, pricingFromForm,
  pricingKey, saveError, saveIndicatorText, saveReducer, shouldAutosave,
  type EditorEvent, type EditorState, type FormState,
} from './admin-package-editor'

const VERSION = {
  title: 'Brunch', subtitle: 'Sub', description: 'Desc', price_note: 'Note',
  cover_image_url: 'https://example.com/a.png', magazine_url: null, min_guests: 2, max_guests: 10,
  pricing_terms: {
    mode: 'structured', base_price: 100, included_guests: 10, extra_guest_price: 5, service_charge_pct: 10,
    service_charge_label: 'Service', deposit_amount: 20, balance_due_days: 7, notes: ['A'],
  },
}

const base = (): FormState => formFromVersion(VERSION)
const withForm = (over: Partial<FormState>): FormState => ({ ...cloneForm(base()), ...over })
const run = (s: EditorState, ...events: EditorEvent[]): EditorState => events.reduce(saveReducer, s)
const start = (revision = 3): EditorState => initialEditorState(base(), revision)
const edit = (form: FormState, now: number): EditorEvent => ({ type: 'edit', form, now })

describe('formFromVersion', () => {
  it('turns the stored version into strings', () => {
    const f = base()
    expect(f).toMatchObject({ title: 'Brunch', subtitle: 'Sub', min_guests: '2', max_guests: '10', magazine_url: '' })
    expect(f.pricing).toMatchObject({
      mode: 'structured', base_price: '100', included_guests: '10', extra_guest_price: '5',
      service_charge_pct: '10', service_charge_label: 'Service', deposit_amount: '20', balance_due_days: '7', notes: ['A'],
    })
  })
  it('reads free-text pricing, and treats missing or unusable pricing as none', () => {
    expect(formFromVersion({ pricing_terms: { mode: 'free_text', free_text: 'Ask us', notes: [] } }).pricing)
      .toMatchObject({ mode: 'free_text', free_text: 'Ask us' })
    for (const v of [null, undefined, 5, 'x', [], { pricing_terms: null }, { pricing_terms: { mode: 'weird' } }]) {
      expect(formFromVersion(v).pricing.mode).toBe('none')
    }
    expect(formFromVersion(null).title).toBe('')
  })
})

describe('pricingFromForm', () => {
  it('none clears the pricing', () => {
    expect(pricingFromForm({ ...base().pricing, mode: 'none' })).toEqual({ ok: true, value: null })
  })
  it('builds the server shape for structured pricing', () => {
    expect(pricingFromForm(base().pricing)).toEqual({
      ok: true,
      value: {
        mode: 'structured', base_price: 100, included_guests: 10, extra_guest_price: 5, service_charge_pct: 10,
        service_charge_label: 'Service', deposit_amount: 20, balance_due_days: 7, notes: ['A'],
      },
    })
  })
  it('leaves optional structured fields out and drops blank notes', () => {
    const r = pricingFromForm({
      ...base().pricing, extra_guest_price: '', service_charge_pct: '', service_charge_label: '',
      balance_due_days: '', notes: ['  ', ' keep '],
    })
    expect(r.ok && r.value).toMatchObject({ extra_guest_price: 0, service_charge_pct: 0, service_charge_label: null, notes: ['keep'] })
  })
  it('explains what is missing or malformed', () => {
    expect(pricingFromForm({ ...base().pricing, base_price: '' })).toEqual({ ok: false, error: 'Base price is required.' })
    expect(pricingFromForm({ ...base().pricing, base_price: '10.999' }).ok).toBe(false)
    expect(pricingFromForm({ ...base().pricing, included_guests: '2.5' })).toEqual({ ok: false, error: 'Included guests must be a whole number.' })
    expect(pricingFromForm({ ...base().pricing, base_price: '-5' }).ok).toBe(false)
  })
  it('uses the server rule for a deposit above the total', () => {
    expect(pricingFromForm({ ...base().pricing, deposit_amount: '500' }))
      .toEqual({ ok: false, error: 'deposit cannot be more than the package total' })
  })
  it('free text needs text', () => {
    expect(pricingFromForm({ ...base().pricing, mode: 'free_text', free_text: 'Ask us' }).ok).toBe(true)
    expect(pricingFromForm({ ...base().pricing, mode: 'free_text', free_text: '  ' }).ok).toBe(false)
  })
})

describe('pricingKey', () => {
  it('ignores spacing and number formatting, and sees real changes', () => {
    const p = base().pricing
    expect(pricingKey({ ...p, base_price: '100.00' })).toBe(pricingKey(p))
    expect(pricingKey({ ...p, base_price: ' 100 ', notes: [' A ', ''] })).toBe(pricingKey(p))
    expect(pricingKey({ ...p, base_price: '101' })).not.toBe(pricingKey(p))
    expect(pricingKey({ ...p, mode: 'none' })).toBe('none')
  })
})

describe('buildDraftBody', () => {
  it('is nochange when nothing changed, including whitespace-only edits', () => {
    expect(buildDraftBody(base(), base(), 3)).toEqual({ kind: 'nochange', held: [] })
    expect(buildDraftBody(base(), withForm({ title: '  Brunch  ', subtitle: 'Sub ' }), 3)).toEqual({ kind: 'nochange', held: [] })
  })

  it('sends only the fields that changed', () => {
    const plan = buildDraftBody(base(), withForm({ title: 'Brunch 2', min_guests: '4' }), 3)
    expect(plan.kind).toBe('send')
    if (plan.kind === 'send') expect(plan.body).toEqual({ expected_revision: 3, meta: { title: 'Brunch 2', min_guests: 4 } })
  })

  it('never has a components key, whatever changes: the body is exactly expected_revision and meta', () => {
    const everything = withForm({
      title: 'T2', subtitle: 'S2', description: 'D2', price_note: 'N2', cover_image_url: 'https://example.com/b.png',
      magazine_url: 'https://example.com/m', min_guests: '3', max_guests: '12',
      pricing: { ...base().pricing, base_price: '200', deposit_amount: '40' },
    })
    for (const form of [everything, withForm({ title: 'x' }), withForm({ subtitle: '' }), withForm({ pricing: { ...base().pricing, mode: 'none' } })]) {
      const plan = buildDraftBody(base(), form, 7)
      expect(plan.kind).toBe('send')
      if (plan.kind !== 'send') continue
      expect(Object.keys(plan.body).sort()).toEqual(['expected_revision', 'meta'])
      expect(JSON.stringify(plan.body)).not.toContain('components')
    }
  })

  it('the module itself never mentions components in code', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/admin-package-editor.ts'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/component/i)
  })

  it('clears optional fields to null, never an empty string', () => {
    const plan = buildDraftBody(base(), withForm({
      subtitle: '', description: '  ', price_note: '', cover_image_url: '', min_guests: '', max_guests: '',
      pricing: { ...base().pricing, mode: 'none' },
    }), 3)
    expect(plan.kind === 'send' && plan.body.meta).toEqual({
      subtitle: null, description: null, price_note: null, cover_image_url: null, min_guests: null, max_guests: null,
      pricing_terms: null,
    })
  })

  it('does not let the title be cleared: it is held, and other changes still save', () => {
    const only = buildDraftBody(base(), withForm({ title: '   ' }), 3)
    expect(only).toEqual({ kind: 'nochange', held: [{ field: 'title', label: 'Title', message: 'Title cannot be empty.' }] })

    const both = buildDraftBody(base(), withForm({ title: '', subtitle: 'New' }), 3)
    expect(both.kind).toBe('send')
    if (both.kind === 'send') {
      expect(both.body.meta).toEqual({ subtitle: 'New' })
      expect(both.held.map(h => h.field)).toEqual(['title'])
    }
  })

  it('holds an invalid link and saves the valid change next to it', () => {
    const plan = buildDraftBody(base(), withForm({ cover_image_url: 'http://example.com/a.png', subtitle: 'New' }), 3)
    expect(plan.kind).toBe('send')
    if (plan.kind === 'send') {
      expect(plan.body.meta).toEqual({ subtitle: 'New' })
      expect(plan.held).toHaveLength(1)
      expect(plan.held[0]).toMatchObject({ field: 'cover_image_url', label: 'Cover image link' })
      expect(plan.held[0].message).toContain('https')
    }
  })

  it('holds a bad pricing block and keeps saving the rest', () => {
    const plan = buildDraftBody(base(), withForm({ title: 'New', pricing: { ...base().pricing, deposit_amount: '999' } }), 3)
    expect(plan.kind === 'send' && plan.body.meta).toEqual({ title: 'New' })
    expect(plan.held).toEqual([{ field: 'pricing_terms', label: 'Pricing', message: 'deposit cannot be more than the package total' }])
  })

  it('holds a guest count that is not a whole number', () => {
    const plan = buildDraftBody(base(), withForm({ min_guests: 'abc' }), 3)
    expect(plan).toEqual({ kind: 'nochange', held: [{ field: 'min_guests', label: 'Minimum guests', message: 'Minimum guests must be a whole number.' }] })
    expect(buildDraftBody(base(), withForm({ max_guests: '0' }), 3).held[0].field).toBe('max_guests')
  })

  it('holds a minimum above the maximum, against the new or the unchanged value', () => {
    const both = buildDraftBody(base(), withForm({ min_guests: '20', max_guests: '5' }), 3)
    expect(both.kind).toBe('nochange')
    expect(both.held.map(h => h.field).sort()).toEqual(['max_guests', 'min_guests'])

    const one = buildDraftBody(base(), withForm({ min_guests: '12', subtitle: 'x' }), 3) // base max is 10
    expect(one.kind === 'send' && one.body.meta).toEqual({ subtitle: 'x' })
    expect(one.held.map(h => h.field)).toEqual(['min_guests'])
  })

  it('snapshot is the form that was sent, as an independent copy', () => {
    const form = withForm({ title: 'A' })
    const plan = buildDraftBody(base(), form, 3)
    form.title = 'changed later'
    form.pricing.notes.push('later')
    expect(plan.kind === 'send' && plan.snapshot.title).toBe('A')
    expect(plan.kind === 'send' && plan.snapshot.pricing.notes).toEqual(['A'])
  })
})

describe('diffMeta', () => {
  it('returns valid changes and held fields separately', () => {
    const d = diffMeta(base(), withForm({ title: 'New', magazine_url: 'nope' }))
    expect(d.meta).toEqual({ title: 'New' })
    expect(d.held.map(h => h.field)).toEqual(['magazine_url'])
  })
})

describe('advanceBase', () => {
  it('becomes the sent snapshot, but held fields keep their old base value', () => {
    const b = base()
    const snapshot = withForm({ title: '', subtitle: 'New' })
    const next = advanceBase(b, snapshot, [{ field: 'title', label: 'Title', message: 'x' }])
    expect(next.title).toBe('Brunch')
    expect(next.subtitle).toBe('New')
    expect(b.subtitle).toBe('Sub') // the old base is not modified
  })
})

describe('saveReducer', () => {
  it('edit makes it dirty, and autosave waits for the debounce', () => {
    const s = run(start(), edit(withForm({ title: 'A' }), 1000))
    expect(s.status).toBe('dirty')
    expect(shouldAutosave(s, 1000 + AUTOSAVE_MS - 1)).toBe(false)
    expect(shouldAutosave(s, 1000 + AUTOSAVE_MS)).toBe(true)
  })

  it('editing back to the saved value returns to idle', () => {
    const s = run(start(), edit(withForm({ title: 'A' }), 1), edit(base(), 2))
    expect(s.status).toBe('idle')
    expect(shouldAutosave(s, 99999)).toBe(false)
  })

  it('saveStart captures the snapshot that is being sent', () => {
    const s = run(start(), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' })
    expect(s.status).toBe('saving')
    expect(s.inFlight?.snapshot.title).toBe('A')
    expect(shouldAutosave(s, 99999)).toBe(false)
  })

  it('an edit during a save stays unsaved and sends next with the new revision', () => {
    let s = run(start(3), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' })
    s = run(s, edit(withForm({ title: 'AB' }), 2))
    expect(s.status).toBe('saving')

    s = run(s, { type: 'saveOk', revision: 4 })
    expect(s.base.title).toBe('A') // the snapshot that was sent, not the live form
    expect(s.form.title).toBe('AB')
    expect(s.revision).toBe(4)
    expect(s.status).toBe('dirty')
    const plan = planFromState(s)
    expect(plan.kind === 'send' && plan.body).toEqual({ expected_revision: 4, meta: { title: 'AB' } })
  })

  it('does not send already-saved values again', () => {
    let s = run(start(3), edit(withForm({ title: 'A', subtitle: 'S' }), 1), { type: 'saveStart' })
    s = run(s, edit(withForm({ title: 'A', subtitle: 'S2' }), 2), { type: 'saveOk', revision: 4 })
    const second = planFromState(s)
    expect(second.kind === 'send' && second.body.meta).toEqual({ subtitle: 'S2' }) // title is not repeated

    s = run(s, { type: 'saveStart' }, { type: 'saveOk', revision: 5 })
    expect(s.status).toBe('saved')
    expect(planFromState(s).kind).toBe('nochange')
    expect(shouldAutosave(s, 99999)).toBe(false)
    expect(run(s, { type: 'saveStart' }).status).toBe('saved') // nothing to send, no state change
  })

  it('keeps a held field out of the base, and settles to saved with the hold still shown', () => {
    let s = run(start(), edit(withForm({ title: '', subtitle: 'New' }), 1))
    expect(s.status).toBe('dirty')
    expect(s.held.map(h => h.field)).toEqual(['title'])

    s = run(s, { type: 'saveStart' }, { type: 'saveOk', revision: 4 })
    expect(s.base.title).toBe('Brunch')
    expect(s.base.subtitle).toBe('New')
    expect(s.status).toBe('saved')
    expect(s.held.map(h => h.field)).toEqual(['title'])
    expect(shouldAutosave(s, 99999)).toBe(false) // a held field alone never loops

    s = run(s, edit(withForm({ title: 'Fixed', subtitle: 'New' }), 5))
    expect(s.held).toEqual([])
    expect(s.status).toBe('dirty')
  })

  it('a failed save keeps the edits unsaved, and a new edit makes it dirty again', () => {
    let s = run(start(), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' }, { type: 'saveFail', message: 'Offline' })
    expect(s.status).toBe('error')
    expect(s.message).toBe('Offline')
    expect(s.base.title).toBe('Brunch')
    expect(shouldAutosave(s, 99999)).toBe(false)
    s = run(s, edit(withForm({ title: 'AB' }), 9))
    expect(s.status).toBe('dirty')
    expect(s.message).toBeNull()
  })

  it('a conflict blocks saving until resolved; resolving adopts the server revision and base', () => {
    const theirs = { form: withForm({ subtitle: 'Theirs' }), revision: 9 }
    let s = run(start(3), edit(withForm({ title: 'Mine' }), 1), { type: 'saveStart' }, { type: 'conflict', theirs })
    expect(s.status).toBe('conflict')
    expect(shouldAutosave(s, 99999)).toBe(false)
    s = run(s, edit(withForm({ title: 'Mine2' }), 2))
    expect(s.status).toBe('conflict')
    expect(run(s, { type: 'saveStart' }).status).toBe('conflict')

    const { merged } = mergeConflict(s.base, s.form, theirs.form)
    s = run(s, { type: 'resolve', merged })
    expect(s.revision).toBe(9)
    expect(s.base.subtitle).toBe('Theirs')
    expect(s.form.title).toBe('Mine2')
    expect(s.status).toBe('dirty')
    const plan = planFromState(s)
    expect(plan.kind === 'send' && plan.body).toEqual({ expected_revision: 9, meta: { title: 'Mine2' } })
  })

  it('ignores saveOk with nothing in flight, and resolve with no conflict', () => {
    const s = start()
    expect(run(s, { type: 'saveOk', revision: 5 })).toBe(s)
    expect(run(s, { type: 'resolve', merged: base() })).toBe(s)
  })
})

describe('canSubmit and the indicator', () => {
  it('is blocked while dirty, saving, held, failed or in conflict, with a plain reason', () => {
    expect(canSubmit(start())).toEqual({ ok: true, reason: null })
    expect(canSubmit(run(start(), edit(withForm({ title: 'A' }), 1))).ok).toBe(false)
    expect(canSubmit(run(start(), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' })).reason).toContain('Saving')
    const held = run(start(), edit(withForm({ title: '' }), 1))
    expect(canSubmit(held)).toEqual({ ok: false, reason: '1 field is not saved. Fix it first.' })
    expect(canSubmit(run(start(), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' }, { type: 'saveFail', message: 'x' })).reason).toContain('failed')
    expect(canSubmit(run(start(), { type: 'conflict', theirs: { form: base(), revision: 5 } })).reason).toBe('Resolve the conflict first.')
    const saved = run(start(), edit(withForm({ title: 'A' }), 1), { type: 'saveStart' }, { type: 'saveOk', revision: 4 })
    expect(canSubmit(saved).ok).toBe(true)
  })

  it('says one held field with its reason, several by name', () => {
    expect(heldSummary([])).toBe('')
    expect(heldSummary([{ field: 'title', label: 'Title', message: 'Title cannot be empty.' }]))
      .toBe('1 field not saved: Title: Title cannot be empty.')
    expect(heldSummary([
      { field: 'title', label: 'Title', message: 'a' }, { field: 'pricing_terms', label: 'Pricing', message: 'b' },
    ])).toBe('2 fields not saved: Title, Pricing')
  })

  it('indicator text follows the state', () => {
    expect(saveIndicatorText(start())).toBe('')
    const dirty = run(start(), edit(withForm({ title: 'A' }), 1))
    expect(saveIndicatorText(dirty)).toBe('Unsaved changes')
    expect(saveIndicatorText(run(dirty, { type: 'saveStart' }))).toBe('Saving…')
    expect(saveIndicatorText(run(dirty, { type: 'saveStart' }, { type: 'saveOk', revision: 4 }))).toBe('All changes saved')
    const heldDirty = run(start(), edit(withForm({ title: '', subtitle: 'x' }), 1))
    expect(saveIndicatorText(heldDirty)).toBe('Unsaved changes. 1 field not saved: Title: Title cannot be empty.')
    const heldSaved = run(heldDirty, { type: 'saveStart' }, { type: 'saveOk', revision: 4 })
    expect(saveIndicatorText(heldSaved)).toBe('1 field not saved: Title: Title cannot be empty.')
    expect(saveIndicatorText(run(start(), { type: 'conflict', theirs: { form: base(), revision: 5 } }))).toContain('changed somewhere else')
  })
})

describe('mergeConflict', () => {
  it('keeps my changes and the server changes when they touch different fields', () => {
    const r = mergeConflict(base(), withForm({ title: 'Mine' }), withForm({ subtitle: 'Theirs' }))
    expect(r.clashes).toEqual([])
    expect(r.merged.title).toBe('Mine')
    expect(r.merged.subtitle).toBe('Theirs')
  })

  it('is not a clash when both made the same change, or only formatting differs', () => {
    const r = mergeConflict(base(), withForm({ title: 'Same' }), withForm({ title: ' Same ' }))
    expect(r.clashes).toEqual([])
  })

  it('reports a clash when both changed a field to different values, and keeps mine', () => {
    const r = mergeConflict(
      base(),
      withForm({ title: 'Mine', description: 'D mine' }),
      withForm({ title: 'Theirs', subtitle: 'S theirs' })
    )
    expect(r.clashes).toEqual(['title'])
    expect(r.merged.title).toBe('Mine')
    expect(r.merged.description).toBe('D mine')
    expect(r.merged.subtitle).toBe('S theirs')
  })

  it('treats the pricing block as one field', () => {
    const mine = withForm({ pricing: { ...base().pricing, base_price: '150' } })
    const theirs = withForm({ pricing: { ...base().pricing, deposit_amount: '30' } })
    const r = mergeConflict(base(), mine, theirs)
    expect(r.clashes).toEqual(['pricing_terms'])
    expect(r.merged.pricing.base_price).toBe('150')
    expect(r.merged.pricing.deposit_amount).toBe('20')
  })

  it('pickField switches one clash to the server value without touching the rest', () => {
    const theirs = withForm({ title: 'Theirs' })
    const { merged } = mergeConflict(base(), withForm({ title: 'Mine', description: 'D' }), theirs)
    const picked = pickField(merged, theirs, 'title')
    expect(picked.title).toBe('Theirs')
    expect(picked.description).toBe('D')
    expect(merged.title).toBe('Mine') // the input was not modified
  })
})

describe('saveError', () => {
  it('maps each status to fixed text', () => {
    expect(saveError(409, { error: 'PGSECRET' })).toBe(SAVE_CONFLICT)
    expect(saveError(403, null)).toContain('permission')
    expect(saveError(401, null)).toContain('permission')
    expect(saveError(404, null)).toBe('This draft no longer exists.')
    expect(saveError(null, null)).toBe('Network error. Try again.')
  })
  it('shows a short server message on 400 only, and never anything on other codes', () => {
    expect(saveError(400, { error: 'version is not editable' })).toBe('version is not editable')
    expect(saveError(400, { error: 'x'.repeat(201) })).toBe(SAVE_GENERIC)
    expect(saveError(400, null)).toBe(SAVE_GENERIC)
    expect(saveError(500, { error: 'PGSECRET' })).toBe(SAVE_GENERIC)
    expect(saveError(502, { error: 'PGSECRET' })).not.toContain('PGSECRET')
  })
})
