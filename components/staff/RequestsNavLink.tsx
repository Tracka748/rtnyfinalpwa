'use client'

// In-site link to the staff request inbox, with the unread badge. Display only: the inbox page,
// the staff layout and every request route keep their own server-side checks.
// Plain text, 16px, a 44px tap target and a visible focus ring. The badge carries a word ("3 new"),
// so the count never relies on colour alone. What to draw is decided in lib/staff-nav.ts (tested).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInboxUnread } from '@/hooks/useInboxUnread'
import {
  isRequestsPath, requestsBadge, requestsLinkClassName, requestsLinkShowsIcon, shouldRenderRequestsLink,
  type RequestsNavVariant,
} from '@/lib/staff-nav'

export function RequestsNavLink({ variant, onNavigate }: { variant: RequestsNavVariant; onNavigate?: () => void }) {
  const pathname = usePathname()
  const count = useInboxUnread()
  const badge = requestsBadge(count, variant)

  return (
    <Link href="/admin/requests" onClick={onNavigate} className={requestsLinkClassName(variant, isRequestsPath(pathname))}>
      {requestsLinkShowsIcon(variant) && <span className="w-6 text-center" aria-hidden="true">📥</span>}
      <span>Requests</span>
      {badge && (
        <span className={badge.className} aria-label={badge.ariaLabel}>
          {badge.text}
        </span>
      )}
    </Link>
  )
}

/**
 * The only way the menus draw the link: nothing at all unless the answer is exactly `true`.
 * The unread hook lives inside RequestsNavLink, so it never runs for anyone else.
 */
export function StaffRequestsLink({ canView, variant, onNavigate }: {
  canView: unknown
  variant: RequestsNavVariant
  onNavigate?: () => void
}) {
  if (!shouldRenderRequestsLink(canView)) return null
  return <RequestsNavLink variant={variant} onNavigate={onNavigate} />
}
