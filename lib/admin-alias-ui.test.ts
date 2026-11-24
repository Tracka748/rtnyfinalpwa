import { describe, expect, it } from 'vitest'
import {
  GENERIC_SAVE_ERROR, aliasSaveError, canEditAlias, needsAliasFlag, parseAliasRefresh, parseSavedAlias, withAliasFields,
} from './admin-alias-ui'

describe('canEditAlias / needsAliasFlag', () => {
  it('edit is for users with an alias or special users only', () => {
    expect(canEditAlias({ alias: 'jane_doe', is_special: false })).toBe(true)
    expect(canEditAlias({ alias: null, is_special: true })).toBe(true)
    expect(canEditAlias({ alias: 'jane_doe', is_special: true })).toBe(true)
    expect(canEditAlias({ alias: null, is_special: false })).toBe(false)
    expect(canEditAlias({})).toBe(false) // the alias lookup failed, so the fields are absent
  })

  it('flags only a special user with no alias', () => {
    expect(needsAliasFlag({ alias: null, is_special: true })).toBe(true)
    expect(needsAliasFlag({ is_special: true })).toBe(true)
    expect(needsAliasFlag({ alias: 'jane_doe', is_special: true })).toBe(false)
    expect(needsAliasFlag({ alias: null, is_special: false })).toBe(false)
    expect(needsAliasFlag({})).toBe(false)
  })
})

describe('aliasSaveError', () => {
  it('shows the server message for 400 and 409', () => {
    expect(aliasSaveError(409, { success: false, error: 'That alias is already taken.' })).toBe('That alias is already taken.')
    expect(aliasSaveError(400, { success: false, error: 'That alias is reserved.' })).toBe('That alias is reserved.')
  })

  it('uses a fixed message when a 400 or 409 body has no usable message', () => {
    for (const body of [null, {}, { error: 5 }, { error: '   ' }, { error: 'x'.repeat(201) }, 'text']) {
      expect(aliasSaveError(400, body)).toBe(GENERIC_SAVE_ERROR)
      expect(aliasSaveError(409, body)).toBe(GENERIC_SAVE_ERROR)
    }
  })

  it('never shows server text for any other status', () => {
    const body = { success: false, error: 'PGSECRET detail' }
    for (const status of [401, 403, 404, 500, 502]) expect(aliasSaveError(status, body)).not.toContain('PGSECRET')
    expect(aliasSaveError(500, body)).toBe(GENERIC_SAVE_ERROR)
    expect(aliasSaveError(404, body)).toBe('User not found.')
  })
})

describe('parseSavedAlias / parseAliasRefresh', () => {
  it('reads the saved alias from a success body only', () => {
    expect(parseSavedAlias({ success: true, data: { alias: 'jane_doe' } })).toBe('jane_doe')
    expect(parseSavedAlias({ success: false, data: { alias: 'jane_doe' } })).toBeNull()
    expect(parseSavedAlias({ success: true, data: {} })).toBeNull()
    expect(parseSavedAlias(null)).toBeNull()
  })

  it('reads alias and is_special from a refresh body, and rejects other shapes', () => {
    expect(parseAliasRefresh({ success: true, data: { alias: 'jane_doe', is_special: true } })).toEqual({ alias: 'jane_doe', is_special: true })
    expect(parseAliasRefresh({ success: true, data: { alias: null, is_special: false } })).toEqual({ alias: null, is_special: false })
    expect(parseAliasRefresh({ success: false, error: 'x' })).toBeNull()
    expect(parseAliasRefresh({ success: true, data: { alias: 5, is_special: true } })).toBeNull()
    expect(parseAliasRefresh({ success: true, data: { alias: null } })).toBeNull()
    expect(parseAliasRefresh({ success: true })).toBeNull()
    expect(parseAliasRefresh(undefined)).toBeNull()
  })
})

describe('withAliasFields', () => {
  const rows = [{ id: 'a', role: 'user' }, { id: 'b', role: 'user' }]

  it('changes only the matching row and keeps its other fields', () => {
    const out = withAliasFields(rows, 'b', { alias: 'bee_bee', is_special: true })
    expect(out[0]).toBe(rows[0])
    expect(out[1]).toEqual({ id: 'b', role: 'user', alias: 'bee_bee', is_special: true })
  })

  it('does not change its input and leaves the list alone for an unknown id', () => {
    const copy = JSON.parse(JSON.stringify(rows))
    expect(withAliasFields(rows, 'zzz', { alias: 'x_y_z' })).toEqual(rows)
    expect(rows).toEqual(copy)
  })

  it('can set only the alias and keep is_special', () => {
    const out = withAliasFields([{ id: 'a', is_special: true, alias: null }], 'a', { alias: 'new_one' })
    expect(out[0]).toEqual({ id: 'a', is_special: true, alias: 'new_one' })
  })
})
