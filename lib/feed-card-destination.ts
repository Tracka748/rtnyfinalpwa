// Where a feed card goes when tapped. Pure, no I/O, so every card type is unit-tested.
//
// Behaviour for cards without a package href is identical to what announcement-feed.tsx
// did inline before this module existed.

export interface DestinationInput {
  type: string
  cta_url?: string | null
  event_id?: string | null
  href?: string | null
}

export type CardDestination =
  | { kind: 'internal'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'deal' }
  | { kind: 'none' }

// The only href the feed API produces for packages (packageHref in lib/feed-package-cards.ts).
const PACKAGE_HREF_RE = /^\/packages\/[a-z][a-z0-9_]{0,63}$/

export const isPackageHref = (v: unknown): v is string => typeof v === 'string' && PACKAGE_HREF_RE.test(v)

export function feedCardDestination(card: DestinationInput): CardDestination {
  // A package href wins over the card type. Anything that is not exactly /packages/{key}
  // is ignored rather than trusted.
  if (isPackageHref(card.href)) return { kind: 'internal', url: card.href }

  switch (card.type) {
    case 'announcement': {
      const url = card.cta_url
      if (!url) return { kind: 'none' }
      return url.startsWith('/') && !url.startsWith('//')
        ? { kind: 'internal', url }
        : { kind: 'external', url }
    }
    case 'curated':
    case 'featured':
      return card.event_id ? { kind: 'internal', url: `/events/${card.event_id}` } : { kind: 'none' }
    case 'deal':
      return { kind: 'deal' }
    default:
      return { kind: 'none' }
  }
}
