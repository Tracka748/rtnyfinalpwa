import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ALIAS_RESERVED_WORDS, normalizeAlias, validateAlias } from './alias-validation'

describe('normalizeAlias', () => {
  it('trims, strips one leading @ and lowercases', () => {
    expect(normalizeAlias('  @Jane_Doe ')).toBe('jane_doe')
    expect(normalizeAlias('JANE')).toBe('jane')
  })
  it('strips only one @', () => {
    expect(normalizeAlias('@@jane')).toBe('@jane')
  })
  it('turns non-strings into an empty string', () => {
    for (const v of [null, undefined, 5, {}, []]) expect(normalizeAlias(v)).toBe('')
  })
})

describe('validateAlias', () => {
  it('accepts good aliases and returns the normalised value', () => {
    expect(validateAlias('jane_doe')).toEqual({ ok: true, alias: 'jane_doe' })
    expect(validateAlias(' @Jane99 ')).toEqual({ ok: true, alias: 'jane99' })
    expect(validateAlias('9_9')).toEqual({ ok: true, alias: '9_9' })
  })
  it('requires a value', () => {
    for (const v of ['', '   ', '@', undefined, null, 7]) {
      expect(validateAlias(v)).toEqual({ ok: false, error: 'Alias is required.' })
    }
  })
  it('rejects characters other than letters, numbers and underscores', () => {
    for (const v of ['jane doe', 'jane-doe', 'jane.doe', 'jané', '@@jane', 'jane!']) {
      expect(validateAlias(v)).toEqual({ ok: false, error: 'Use only letters, numbers and underscores.' })
    }
  })
  it('enforces 3 to 30 characters', () => {
    expect(validateAlias('ab').ok).toBe(false)
    expect(validateAlias('abc').ok).toBe(true)
    expect(validateAlias('a'.repeat(30)).ok).toBe(true)
    expect(validateAlias('a'.repeat(31))).toEqual({ ok: false, error: 'Alias must be 3 to 30 characters.' })
  })
  it('blocks reserved words in any case', () => {
    for (const v of ['admin', 'ADMIN', '@Support', 'rtny', 'packages']) {
      expect(validateAlias(v)).toEqual({ ok: false, error: 'That alias is reserved.' })
    }
  })
})

describe('the reserved-word list matches the database', () => {
  // Every migration that inserts into public.alias_reserved_words, so a later migration that adds
  // words is picked up too. The union must equal the constant.
  it('equals the union of every migration insert', () => {
    const dir = path.join(process.cwd(), 'supabase/migrations')
    const words = new Set<string>()
    let inserts = 0
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql'))) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      for (const m of sql.matchAll(/insert\s+into\s+public\.alias_reserved_words[^;]*;/gi)) {
        inserts += 1
        for (const w of m[0].matchAll(/\(\s*'([^']+)'\s*\)/g)) words.add(w[1].toLowerCase())
      }
    }
    expect(inserts).toBeGreaterThan(0)
    expect([...words].sort()).toEqual([...ALIAS_RESERVED_WORDS].sort())
  })
})
