// I/O helpers shared by the public / customer theme-package routes. Database errors are thrown
// as-is so the route's catch can pass them to mapDbError (nothing raw reaches a response).

import { fetchAllRows, loadOwnerNames, type AdminClient } from '@/lib/catalog-api'
import { chunk } from '@/lib/catalog-guards'
import {
  projectLiveDocument,
  type LiveDocument, type PublicTheme, type RawComponent, type RawItem, type RawLink, type RawOption, type RawService,
} from '@/lib/theme-package-public'

export const PUBLIC_PAGE = 50
export const RATE_LIMIT_PER_DAY = 10
const DAY_MS = 24 * 60 * 60 * 1000
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000

const VERSION_PUBLIC_COLUMNS =
  'id, title, subtitle, description, cover_image_url, magazine_url, price_note, min_guests, max_guests, published_at'

export interface LivePackage {
  pkg: { id: string; key: string; occasion: string }
  theme: PublicTheme | null
  version: {
    id: string; title: string; subtitle: string | null; description: string | null; cover_image_url: string | null
    magazine_url: string | null; price_note: string | null; min_guests: number | null; max_guests: number | null
    published_at: string | null
  }
}

/**
 * The LIVE approved version of an ACTIVE package, or null. Unknown, archived and not-live keys all
 * return null, so callers answer them identically.
 */
export async function resolveLivePackage(supabase: AdminClient, key: string): Promise<LivePackage | null> {
  const { data: pkg, error } = await supabase
    .from('theme_packages')
    .select('id, key, occasion, status, theme_id, live_version_id')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  if (!pkg || pkg.status !== 'active' || !pkg.live_version_id) return null

  const [versionRes, themeRes] = await Promise.all([
    supabase.from('theme_package_versions').select(VERSION_PUBLIC_COLUMNS)
      .eq('id', pkg.live_version_id).eq('package_id', pkg.id).eq('status', 'approved').maybeSingle(),
    pkg.theme_id
      ? supabase.from('themes').select('id, name').eq('id', pkg.theme_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (versionRes.error) throw versionRes.error
  if (themeRes.error) throw themeRes.error
  if (!versionRes.data) return null

  return {
    pkg: { id: pkg.id, key: pkg.key, occasion: pkg.occasion },
    theme: themeRes.data ? { id: themeRes.data.id, name: themeRes.data.name } : null,
    version: versionRes.data,
  }
}

/** Loads everything the live document needs (parallel simple queries) and projects it. */
export async function loadLiveDocument(supabase: AdminClient, live: LivePackage): Promise<LiveDocument> {
  const compRes = await supabase
    .from('theme_package_components')
    .select('id, slot_label, sort_order, requirement, quantity, notes')
    .eq('version_id', live.version.id)
    .order('sort_order')
    .order('created_at')
  if (compRes.error) throw compRes.error
  const components: RawComponent[] = compRes.data ?? []

  const optionPages = await Promise.all(
    chunk(components.map(c => c.id)).map(ids =>
      fetchAllRows<RawOption>((from, to) =>
        supabase.from('theme_package_component_options')
          .select('id, component_id, catalog_item_id, service_id, is_default, sort_order')
          .in('component_id', ids).order('component_id').order('sort_order').order('id').range(from, to)))
  )
  const optionErr = optionPages.find(p => p.error)
  if (optionErr) throw optionErr.error
  const options: RawOption[] = optionPages.flatMap(p => p.data ?? [])

  const itemIds = [...new Set(options.map(o => o.catalog_item_id))]
  const serviceIds = [...new Set(options.map(o => o.service_id).filter((x): x is string => !!x))]

  const [itemPages, servicePages, linkPages] = await Promise.all([
    Promise.all(chunk(itemIds).map(ids =>
      supabase.from('catalog_items').select('id, name, description, item_type, image_url, status').in('id', ids))),
    Promise.all(chunk(serviceIds).map(ids =>
      supabase.from('vendor_services').select('id, price, pricing_model, status, partner_id, vendor_id').in('id', ids))),
    Promise.all(chunk(itemIds).map(ids =>
      fetchAllRows<RawLink>((from, to) =>
        supabase.from('catalog_item_services').select('catalog_item_id, service_id, status, price_treatment')
          .in('catalog_item_id', ids).order('id').range(from, to)))),
  ])
  const enrichErr = [...itemPages, ...servicePages].find(p => p.error) ?? linkPages.find(p => p.error)
  if (enrichErr) throw enrichErr.error

  const items: RawItem[] = itemPages.flatMap(p => (p.data ?? []) as RawItem[])
  const services: RawService[] = servicePages.flatMap(p => (p.data ?? []) as RawService[])
  const links: RawLink[] = linkPages.flatMap(p => p.data ?? [])
  const ownerOf = await loadOwnerNames(supabase, services)

  return projectLiveDocument({
    pkg: live.pkg, theme: live.theme, version: live.version, components, options, items, services, links, ownerOf,
  })
}

export type AbuseResult =
  | { kind: 'ok' }
  | { kind: 'rate_limited' }
  | { kind: 'duplicate'; requestId: string }

/**
 * (a) at most RATE_LIMIT_PER_DAY package requests per user per 24h; (b) the same version again
 * within 2 minutes returns the earlier request. Soft limits, not a lock.
 */
export async function checkRequestAbuse(
  supabase: AdminClient,
  o: { userId: string; versionId: string; now?: number }
): Promise<AbuseResult> {
  const now = o.now ?? Date.now()
  const since24h = new Date(now - DAY_MS).toISOString()
  const since2m = new Date(now - DUPLICATE_WINDOW_MS).toISOString()

  const [recent, dup] = await Promise.all([
    supabase.from('plan_requests').select('id')
      .eq('user_id', o.userId).eq('request_source', 'theme_package').gte('created_at', since24h).limit(RATE_LIMIT_PER_DAY),
    supabase.from('plan_requests').select('id')
      .eq('user_id', o.userId).eq('request_source', 'theme_package').eq('selected_package_id', o.versionId)
      .gte('created_at', since2m).order('created_at', { ascending: false }).limit(1),
  ])
  if (recent.error) throw recent.error
  if (dup.error) throw dup.error

  if ((recent.data ?? []).length >= RATE_LIMIT_PER_DAY) return { kind: 'rate_limited' }
  const first = (dup.data ?? [])[0] as { id: string } | undefined
  return first ? { kind: 'duplicate', requestId: first.id } : { kind: 'ok' }
}

/** The account's confirmed auth email, looked up from the session user id; null if unconfirmed or missing. */
export async function getVerifiedEmail(supabase: AdminClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error) throw error
  const user = data?.user
  if (!user?.email || !(user.email_confirmed_at || user.confirmed_at)) return null
  return user.email
}
