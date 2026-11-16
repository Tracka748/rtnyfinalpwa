// Display-only logic for the in-site "Requests" link (sidebar, mobile menu, desktop top bar).
// The server decides access: every request route and the staff layout keep their own checks. These
// helpers only decide what to draw, and anything unexpected means "do not show".

/** Which extra links the site menus show. Only an exact `true` shows Requests. */
export function staffNavLinks(i: { signedIn: boolean; isAdmin: boolean; canViewRequests: unknown }) {
  return {
    showAdmin: i.signedIn && i.isAdmin === true,
    showRequests: i.signedIn && i.canViewRequests === true,
  }
}

// ---- the Requests link itself (components/staff/RequestsNavLink.tsx draws what these decide) ----

import { badgeText } from '@/lib/request-inbox-ui'
import { FOCUS_RING, TAP } from '@/components/admin/requests/ui'

export const REQUESTS_NAV_VARIANTS = ['sidebar', 'menu', 'topbar'] as const
export type RequestsNavVariant = (typeof REQUESTS_NAV_VARIANTS)[number]

/** The link renders only for an exact `true`: false, missing or malformed answers draw nothing. */
export function shouldRenderRequestsLink(canView: unknown): boolean {
  return canView === true
}

// Layout per place. Text size, tap target and focus ring are shared by all three.
const LAYOUT: Record<RequestsNavVariant, string> = {
  sidebar: 'flex items-center gap-3 px-4 transition-colors hover:bg-white/5',
  menu: 'flex items-center gap-3 rounded-lg px-3 transition-colors hover:bg-[#1A1A1A]',
  topbar: 'flex items-center gap-2 rounded-lg px-3 font-medium transition-colors hover:bg-[#1A1A1A]',
}

/** 16px text, a 44px tap target and a visible focus ring everywhere. */
export function requestsLinkClassName(variant: RequestsNavVariant, active: boolean): string {
  return `${LAYOUT[variant]} ${TAP} text-base leading-6 ${FOCUS_RING} ${active ? 'text-[#59FFA0]' : 'text-[#F9FDFF]'}`
}

/** The top bar has no room for the icon; the other two keep it. */
export const requestsLinkShowsIcon = (variant: RequestsNavVariant): boolean => variant !== 'topbar'

/** The badge always carries a word: "3 new", "9+ new". Null when there is nothing unread. */
export function requestsBadge(count: number | null | undefined, variant: RequestsNavVariant):
  { text: string; ariaLabel: string; className: string } | null {
  const n = badgeText(count)
  if (!n) return null
  return {
    text: `${n} new`,
    ariaLabel: `${count} unread requests`,
    className: `${variant === 'topbar' ? '' : 'ml-auto'} rounded-full bg-[#59FFA0] px-2 text-sm font-bold leading-5 text-black`.trim(),
  }
}

export const isRequestsPath = (pathname: string | null | undefined): boolean =>
  typeof pathname === 'string' && pathname.startsWith('/admin/requests')

/** Reads the staff-access route body; only an exact `true` counts. */
export function parseStaffAccessBody(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false
  const data = (json as { data?: unknown }).data
  if (!data || typeof data !== 'object') return false
  return (data as { can_view?: unknown }).can_view === true
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>

export const STAFF_ACCESS_URL = '/api/v1/users/me/staff-access'

/** Asks the server whether to show the Requests link. Never throws: any failure is `false`. */
export async function lookupCanView(fetchImpl: FetchLike = (input, init) => fetch(input, init)): Promise<boolean> {
  try {
    const res = await fetchImpl(STAFF_ACCESS_URL, { cache: 'no-store' })
    if (!res || res.ok !== true) return false
    return parseStaffAccessBody(await res.json())
  } catch {
    return false
  }
}
