// Pure helpers for the /packages browse page. No I/O, no React.
//
// Occasion is free text, so chips are built from the data: spelling variants such as "Birthday",
// "birthday" and " Birthday  " collapse into one chip and one filter.

import type { PublicCard } from '@/lib/theme-package-public'

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ')

/** The grouping key: trimmed, inner whitespace collapsed, lowercased. */
export const normaliseOccasion = (s: string): string => collapse(s).toLowerCase()

export interface OccasionChip {
  key: string
  label: string
  count: number
}

/**
 * One chip per distinct normalised occasion. The label is the most common original spelling
 * (whitespace collapsed); ties go to the spelling seen first. Blank occasions get no chip.
 * Chips are sorted by label.
 */
export function occasionChips(cards: ReadonlyArray<Pick<PublicCard, 'occasion'>>): OccasionChip[] {
  const groups = new Map<string, { spellings: Map<string, number>; count: number }>()
  for (const c of cards) {
    const key = normaliseOccasion(c.occasion)
    if (!key) continue
    const spelling = collapse(c.occasion)
    const g = groups.get(key) ?? { spellings: new Map<string, number>(), count: 0 }
    g.spellings.set(spelling, (g.spellings.get(spelling) ?? 0) + 1)
    g.count += 1
    groups.set(key, g)
  }
  const chips: OccasionChip[] = []
  for (const [key, g] of groups) {
    let label = ''
    let best = 0
    for (const [spelling, n] of g.spellings) {
      if (n > best) { label = spelling; best = n } // strictly greater: ties keep the first seen
    }
    chips.push({ key, label, count: g.count })
  }
  return chips.sort((a, b) => a.label.localeCompare(b.label))
}

/** All cards when `key` is null, otherwise those whose normalised occasion equals it. */
export function filterByOccasion<T extends Pick<PublicCard, 'occasion'>>(cards: readonly T[], key: string | null): T[] {
  return key === null ? [...cards] : cards.filter(c => normaliseOccasion(c.occasion) === key)
}

/** Appends `incoming` to `existing`, skipping any key already present (first copy wins). */
export function mergeCards<T extends Pick<PublicCard, 'key'>>(existing: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(existing.map(c => c.key))
  const out = [...existing]
  for (const c of incoming) {
    if (seen.has(c.key)) continue
    seen.add(c.key)
    out.push(c)
  }
  return out
}

/** A stable accent for a package key, so the fallback tiles vary but never change between renders. */
export function tintForKey(key: string): 'mint' | 'cyan' {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h % 2 === 0 ? 'mint' : 'cyan'
}
