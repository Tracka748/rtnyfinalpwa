import { describe, expect, it } from 'vitest'
import { MIN_SECRET_LENGTH, checkBearer, cronSecretConfigured } from '@/lib/internal-auth'

const SECRET = 's'.repeat(40)

describe('cronSecretConfigured', () => {
  it('needs at least 32 characters', () => {
    expect(MIN_SECRET_LENGTH).toBe(32)
    for (const v of [undefined, null, '', ' '.repeat(40), 'x'.repeat(31)]) expect(cronSecretConfigured(v), String(v)).toBe(false)
    expect(cronSecretConfigured('x'.repeat(32))).toBe(true)
  })
})

describe('checkBearer', () => {
  it('accepts exactly "Bearer <secret>"', () => {
    expect(checkBearer(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it('fails closed without a usable secret, even when the header matches', () => {
    expect(checkBearer('Bearer ', '')).toBe(false)
    expect(checkBearer('Bearer short', 'short')).toBe(false)
    expect(checkBearer(`Bearer ${SECRET}`, undefined)).toBe(false)
  })

  it('rejects a missing header, another scheme, extra text, and wrong or different-length tokens', () => {
    for (const h of [
      undefined, null, '', SECRET, `bearer ${SECRET}`, `Basic ${SECRET}`, `Bearer  ${SECRET}`, `Bearer ${SECRET} `,
      `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, `Bearer ${'t'.repeat(40)}`, 'Bearer',
    ]) {
      expect(checkBearer(h as string, SECRET), JSON.stringify(h)).toBe(false)
    }
  })
})
