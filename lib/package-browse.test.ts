import { describe, expect, it } from 'vitest'
import { filterByOccasion, mergeCards, normaliseOccasion, occasionChips, tintForKey } from './package-browse'

const c = (key: string, occasion: string) => ({ key, occasion })

describe('normaliseOccasion', () => {
  it('trims, collapses inner whitespace and lowercases', () => {
    expect(normaliseOccasion('  Birthday   Party ')).toBe('birthday party')
    expect(normaliseOccasion('BIRTHDAY')).toBe('birthday')
  })
})

describe('occasionChips', () => {
  it('groups spelling variants into one chip and counts them', () => {
    const chips = occasionChips([c('a', 'Birthday'), c('b', 'birthday'), c('c', ' Birthday '), c('d', 'Wedding')])
    expect(chips).toEqual([
      { key: 'birthday', label: 'Birthday', count: 3 },
      { key: 'wedding', label: 'Wedding', count: 1 },
    ])
  })
  it('labels with the most common spelling', () => {
    const chips = occasionChips([c('a', 'birthday'), c('b', 'Birthday'), c('c', 'Birthday')])
    expect(chips[0].label).toBe('Birthday')
  })
  it('breaks ties by first seen', () => {
    expect(occasionChips([c('a', 'birthday'), c('b', 'Birthday')])[0].label).toBe('birthday')
    expect(occasionChips([c('a', 'Birthday'), c('b', 'birthday')])[0].label).toBe('Birthday')
  })
  it('ignores blank occasions and sorts by label', () => {
    const chips = occasionChips([c('a', 'Wedding'), c('b', '   '), c('c', 'Anniversary')])
    expect(chips.map(x => x.label)).toEqual(['Anniversary', 'Wedding'])
  })
})

describe('filterByOccasion', () => {
  const cards = [c('a', 'Birthday'), c('b', 'birthday '), c('c', 'Wedding')]
  it('returns everything for null', () => {
    expect(filterByOccasion(cards, null)).toHaveLength(3)
  })
  it('matches every spelling variant', () => {
    expect(filterByOccasion(cards, 'birthday').map(x => x.key)).toEqual(['a', 'b'])
  })
  it('returns nothing for an unknown key', () => {
    expect(filterByOccasion(cards, 'graduation')).toEqual([])
  })
})

describe('mergeCards', () => {
  it('appends new keys and drops duplicates, keeping the first copy', () => {
    const merged = mergeCards([{ key: 'a', n: 1 }, { key: 'b', n: 1 }], [{ key: 'b', n: 2 }, { key: 'c', n: 2 }])
    expect(merged).toEqual([{ key: 'a', n: 1 }, { key: 'b', n: 1 }, { key: 'c', n: 2 }])
  })
})

describe('tintForKey', () => {
  it('is stable and always mint or cyan', () => {
    for (const k of ['spooky_birthday', 'x', 'a_b_c']) {
      expect(tintForKey(k)).toBe(tintForKey(k))
      expect(['mint', 'cyan']).toContain(tintForKey(k))
    }
  })
})
