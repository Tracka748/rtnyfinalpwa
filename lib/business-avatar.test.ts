import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { AVATAR_FALLBACK, getAvatarEmoji } from '@/lib/business-avatar'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('getAvatarEmoji', () => {
  it('maps categories by substring, case-insensitively, as the stop card did', () => {
    expect(getAvatarEmoji('Food & Drink')).toBe('🍽️')
    expect(getAvatarEmoji('cafe')).toBe('☕')
    expect(getAvatarEmoji('Rooftop BAR')).toBe('🍸')
    expect(getAvatarEmoji('self_care')).toBe('💆')
    expect(getAvatarEmoji('activity')).toBe('🎯')
  })

  it('falls back to the pin for unknown, empty or missing categories', () => {
    expect(AVATAR_FALLBACK).toBe('📍')
    expect(getAvatarEmoji('venue')).toBe('📍')
    expect(getAvatarEmoji('')).toBe('📍')
    expect(getAvatarEmoji(null)).toBe('📍')
    expect(getAvatarEmoji(undefined)).toBe('📍')
  })
})

describe('both components share the fallback', () => {
  for (const file of ['components/custom/plan/PlanMyDay.tsx', 'components/custom/dashboard/SavedDayPlans.tsx']) {
    it(`${file} imports getAvatarEmoji and does not define its own`, () => {
      const src = read(file)
      expect(src).toMatch(/import \{[^}]*getAvatarEmoji[^}]*\} from '@\/lib\/business-avatar'/)
      expect(src).not.toMatch(/function getAvatarEmoji|const AVATAR_EMOJI/)
    })
  }
})

describe('SavedDayPlans images', () => {
  const src = read('components/custom/dashboard/SavedDayPlans.tsx')

  it('renders a fixed logo slot with the emoji fallback for every stop', () => {
    expect(src).toMatch(/w-10 h-10 rounded-xl[^"]*shrink-0/)
    expect(src).toMatch(/stop\.logo_url \? \(/)
    expect(src).toMatch(/getAvatarEmoji\(stop\.category\)/)
  })

  it('uses only the server-resolved logo_url and cover_image_url as image sources', () => {
    const srcs = [...src.matchAll(/src=\{([^}]+)\}/g)].map(m => m[1].trim()).sort()
    expect(srcs).toEqual(['stop.cover_image_url', 'stop.logo_url'])
  })

  it('treats the cover as decorative, under the shared scrim', () => {
    expect(src).toMatch(/src=\{stop\.cover_image_url\}\s*alt=""\s*aria-hidden="true"/)
    expect(src).toMatch(/rgba\(0,0,0,\$\{COVER_SCRIM_ALPHA\}\)/)
  })

  it('sets row text colours only from COVER_TEXT and keeps text at 14px or more', () => {
    // The stop rows only: from the map to the Regenerate link's container (that link is out of scope).
    const start = src.indexOf('plan.stops.map')
    const rows = src.slice(start, src.indexOf('<div className="pt-3">', start))
    expect(rows.length).toBeGreaterThan(500)
    expect(rows).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
    expect(rows).not.toMatch(/text-\[#[0-9A-Fa-f]{3,8}\]/)
  })
})
