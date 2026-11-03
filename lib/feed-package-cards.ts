// Pure functions for putting theme packages into the discovery feed. No I/O.

import { isUuid, type Validated } from '@/lib/catalog-validation'
import { projectCard } from '@/lib/theme-package-public'

export interface FeedPackageInfo {
  key: string
  occasion: string
  title: string
  subtitle: string | null
  cover_image_url: string | null
  price_note: string | null
}

export interface FeedCardRow {
  id: string
  type: string
  headline: string
  sub: string | null
  action_label: string | null
  cta_url: string | null
  event_id: string | null
  promo_code: string | null
  image_url: string | null
  theme_package_id: string | null
}

export type PublicFeedCard = Omit<FeedCardRow, 'theme_package_id'> & {
  package?: FeedPackageInfo
  href?: string
}

/**
 * The liveness rule of the public package routes (resolveLivePackage): the package is active, its
 * live_version_id is set, and that version belongs to the package and is approved.
 */
export function isPackageLive(
  pkg: { id: string; status: string; live_version_id: string | null } | null | undefined,
  version: { id: string; package_id: string; status: string } | null | undefined
): boolean {
  return (
    !!pkg && !!version &&
    pkg.status === 'active' &&
    !!pkg.live_version_id &&
    version.id === pkg.live_version_id &&
    version.package_id === pkg.id &&
    version.status === 'approved'
  )
}

/** The feed's package fields, built from the same projection as the public package cards. */
export function toFeedPackageInfo(
  pkg: { key: string; occasion: string },
  version: {
    title: string; subtitle: string | null; cover_image_url: string | null; price_note: string | null
    min_guests: number | null; max_guests: number | null
  }
): FeedPackageInfo {
  const c = projectCard({ pkg, theme: null, version })
  return {
    key: c.key,
    occasion: c.occasion,
    title: c.title,
    subtitle: c.subtitle,
    cover_image_url: c.cover_image_url,
    price_note: c.price_note,
  }
}

export const packageHref = (key: string) => `/packages/${key}`

const isFilled = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/**
 * Cards without a package id are returned exactly as before (minus the internal theme_package_id).
 * A card whose package is live gets `package` and `href`, and its own non-empty headline / sub /
 * image win over the package's. A card whose package is not live is dropped.
 */
export function applyLivePackages(rows: FeedCardRow[], live: ReadonlyMap<string, FeedPackageInfo>): PublicFeedCard[] {
  const out: PublicFeedCard[] = []
  for (const row of rows) {
    const { theme_package_id, ...rest } = row
    if (!theme_package_id) {
      out.push(rest)
      continue
    }
    const info = live.get(theme_package_id)
    if (!info) continue
    out.push({
      ...rest,
      headline: isFilled(rest.headline) ? rest.headline : info.title,
      sub: isFilled(rest.sub) ? rest.sub : info.subtitle,
      image_url: isFilled(rest.image_url) ? rest.image_url : info.cover_image_url,
      package: { ...info },
      href: packageHref(info.key),
    })
  }
  return out
}

// ---- admin attach / detach body ----

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const pass = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })

/** { theme_package_id: uuid | null } and nothing else. */
export function validateAttachBody(raw: unknown): Validated<{ theme_package_id: string | null }> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('Request body must be a JSON object')
  const body = raw as Record<string, unknown>
  const extra = Object.keys(body).filter(k => k !== 'theme_package_id')
  if (extra.length) return fail(`Unknown field(s): ${extra.slice(0, 5).map(k => k.slice(0, 40)).join(', ')}`)
  if (!('theme_package_id' in body)) return fail('theme_package_id is required (a uuid, or null to detach)')
  const v = body.theme_package_id
  if (v === null) return pass({ theme_package_id: null })
  if (!isUuid(v)) return fail('theme_package_id must be a valid uuid or null')
  return pass({ theme_package_id: v.toLowerCase() })
}
