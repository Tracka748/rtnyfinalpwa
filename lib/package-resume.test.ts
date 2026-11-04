import { describe, expect, it } from 'vitest'
import { clearResume, loadResume, RESUME_MAX_AGE_MS, RESUME_PREFIX, saveResume, type ResumePayload } from '@/lib/package-resume'
import type { SavedChoice } from '@/lib/package-selection'
import type { StorageLike } from '@/lib/return-to'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v) },
    removeItem: k => { data.delete(k) },
  }
}

const throwing = (which: 'get' | 'set' | 'remove'): StorageLike => ({
  getItem: () => { if (which === 'get') throw new Error('SecurityError'); return null },
  setItem: () => { if (which === 'set') throw new Error('QuotaExceededError') },
  removeItem: () => { if (which === 'remove') throw new Error('SecurityError') },
})

const choice: SavedChoice = {
  componentId: 'c1', slotLabel: 'Cake', optional: false, included: true, includedIsDefault: true,
  optionId: 'o1', optionKey: 'cake a|', optionIsDefault: true,
}
const NOW = 1_800_000_000_000
const payload = (over: Partial<ResumePayload> = {}): ResumePayload => ({
  v: 1, packageKey: 'spooky_birthday', versionId: 'v1', guestCount: 25, selection: [choice],
  form: { eventDate: '2027-01-15', eventType: 'Birthday', guestCount: '25', budgetRange: '', notes: 'hi' },
  savedAt: NOW, ...over,
})

describe('saveResume / loadResume', () => {
  it('round-trips what was saved', () => {
    const s = memoryStorage()
    expect(saveResume(s, payload())).toBe(true)
    expect(loadResume(s, 'spooky_birthday', NOW + 1000)).toEqual(payload())
  })
  it('is namespaced per package key', () => {
    const s = memoryStorage()
    saveResume(s, payload())
    expect([...s.data.keys()]).toEqual([RESUME_PREFIX + 'spooky_birthday'])
    expect(loadResume(s, 'another_package', NOW)).toBeNull()
  })
  it('ignores state that is too old, or dated in the future', () => {
    const s = memoryStorage()
    saveResume(s, payload())
    expect(loadResume(s, 'spooky_birthday', NOW + RESUME_MAX_AGE_MS)).not.toBeNull()
    expect(loadResume(s, 'spooky_birthday', NOW + RESUME_MAX_AGE_MS + 1)).toBeNull()
    expect(loadResume(s, 'spooky_birthday', NOW - 10 * 60 * 1000)).toBeNull()
  })
  it('returns null for missing, corrupt or wrongly shaped data', () => {
    const s = memoryStorage()
    const key = RESUME_PREFIX + 'spooky_birthday'
    expect(loadResume(s, 'spooky_birthday', NOW)).toBeNull()
    s.data.set(key, '{nope')
    expect(loadResume(s, 'spooky_birthday', NOW)).toBeNull()
    for (const bad of [
      'null', '"x"', '5',
      JSON.stringify({ ...payload(), v: 2 }),
      JSON.stringify({ ...payload(), packageKey: 'other' }),
      JSON.stringify({ ...payload(), versionId: 7 }),
      JSON.stringify({ ...payload(), guestCount: 'many' }),
      JSON.stringify({ ...payload(), savedAt: 'yesterday' }),
      JSON.stringify({ ...payload(), selection: 'x' }),
      JSON.stringify({ ...payload(), selection: [{ componentId: 'c1' }] }),
      JSON.stringify({ ...payload(), form: { eventDate: '2027-01-15' } }),
      JSON.stringify({ ...payload(), form: null }),
    ]) {
      s.data.set(key, bad)
      expect(loadResume(s, 'spooky_birthday', NOW)).toBeNull()
    }
  })
  it('never throws: no storage, or storage that throws', () => {
    expect(saveResume(null, payload())).toBe(false)
    expect(loadResume(null, 'spooky_birthday', NOW)).toBeNull()
    expect(saveResume(throwing('set'), payload())).toBe(false)
    expect(loadResume(throwing('get'), 'spooky_birthday', NOW)).toBeNull()
    expect(() => clearResume(throwing('remove'), 'spooky_birthday')).not.toThrow()
    expect(() => clearResume(null, 'spooky_birthday')).not.toThrow()
  })
})

describe('clearResume', () => {
  it('removes the saved state for that package only', () => {
    const s = memoryStorage()
    saveResume(s, payload())
    saveResume(s, payload({ packageKey: 'other' }))
    clearResume(s, 'spooky_birthday')
    expect(loadResume(s, 'spooky_birthday', NOW)).toBeNull()
    expect(loadResume(s, 'other', NOW)).not.toBeNull()
  })
})
