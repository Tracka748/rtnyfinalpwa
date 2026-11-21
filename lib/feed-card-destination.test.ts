import { describe, expect, it } from 'vitest'
import { feedCardDestination, isPackageHref } from './feed-card-destination'

describe('feedCardDestination', () => {
  it('keeps existing behaviour for announcement cards', () => {
    expect(feedCardDestination({ type: 'announcement', cta_url: '/events' })).toEqual({ kind: 'internal', url: '/events' })
    expect(feedCardDestination({ type: 'announcement', cta_url: 'https://x.com' })).toEqual({ kind: 'external', url: 'https://x.com' })
    expect(feedCardDestination({ type: 'announcement' })).toEqual({ kind: 'none' })
  })
  it('treats protocol-relative urls as external', () => {
    expect(feedCardDestination({ type: 'announcement', cta_url: '//evil.com' })).toEqual({ kind: 'external', url: '//evil.com' })
  })
  it('keeps event routing for curated and featured', () => {
    expect(feedCardDestination({ type: 'curated', event_id: 'e1' })).toEqual({ kind: 'internal', url: '/events/e1' })
    expect(feedCardDestination({ type: 'featured', event_id: null })).toEqual({ kind: 'none' })
  })
  it('keeps the deal modal', () => {
    expect(feedCardDestination({ type: 'deal' })).toEqual({ kind: 'deal' })
  })
  it('sends a package card to its package page whatever its type', () => {
    for (const type of ['announcement', 'curated', 'deal', 'featured']) {
      expect(feedCardDestination({ type, href: '/packages/spooky_birthday', event_id: 'e1' }))
        .toEqual({ kind: 'internal', url: '/packages/spooky_birthday' })
    }
  })
  it('ignores a malformed href', () => {
    for (const href of ['/packages/', '/packages/A', '/packages/a/b', 'https://x.com/packages/a', '/admin', '//packages/a', 'javascript:1']) {
      expect(isPackageHref(href)).toBe(false)
      expect(feedCardDestination({ type: 'curated', href })).toEqual({ kind: 'none' })
    }
  })
})
