import { describe, expect, it } from 'vitest'
import { RETURN_TO_KEY, safeReturnPath, safeSessionStorage, setReturnTo, type StorageLike } from '@/lib/return-to'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v) },
    removeItem: k => { data.delete(k) },
  }
}

describe('safeReturnPath: accepted', () => {
  it.each([
    ['/packages/spooky_birthday', '/packages/spooky_birthday'],
    ['/dashboard', '/dashboard'],
    ['/packages/x?step=2', '/packages/x?step=2'],
    ['/packages/x#sheet', '/packages/x#sheet'],
    ['/', '/'],
  ])('%s', (raw, expected) => {
    expect(safeReturnPath(raw)).toBe(expected)
  })
})

describe('safeReturnPath: rejected', () => {
  it.each([
    ['protocol-relative', '//evil.example.com'],
    ['protocol-relative with path', '//evil.example.com/packages/x'],
    ['absolute https', 'https://evil.example.com'],
    ['absolute http', 'http://evil.example.com/packages/x'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,hi'],
    ['backslash host', '/\\evil.example.com'],
    ['backslash in path', '/packages\\..\\x'],
    ['no leading slash', 'packages/x'],
    ['empty', ''],
    ['newline', '/packages/x\nSet-Cookie: a=b'],
    ['tab', '/packages/\tx'],
    ['null byte', '/packages/x\u0000'],
    ['C1 control', '/packages/x\u0085'],
  ])('%s', (_name, raw) => {
    expect(safeReturnPath(raw)).toBeNull()
  })

  it('rejects overly long paths and non-strings', () => {
    expect(safeReturnPath('/' + 'a'.repeat(300))).toBeNull()
    for (const v of [null, undefined, 5, {}, [], true]) expect(safeReturnPath(v)).toBeNull()
  })
})

describe('setReturnTo / safeSessionStorage', () => {
  it('stores a safe path under the return-to key', () => {
    const s = memoryStorage()
    expect(setReturnTo(s, '/packages/spooky_birthday')).toBe(true)
    expect(s.getItem(RETURN_TO_KEY)).toBe('/packages/spooky_birthday')
  })
  it('never stores an unsafe path', () => {
    const s = memoryStorage()
    expect(setReturnTo(s, '//evil.example.com')).toBe(false)
    expect(setReturnTo(s, 'https://evil.example.com')).toBe(false)
    expect(s.data.size).toBe(0)
  })
  it('returns false without storage or when storage throws', () => {
    expect(setReturnTo(null, '/packages/x')).toBe(false)
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => {},
    }
    expect(setReturnTo(throwing, '/packages/x')).toBe(false)
  })
  it('safeSessionStorage is null where there is no window (node)', () => {
    expect(safeSessionStorage()).toBeNull()
  })
})
