'use client'

import Link from 'next/link'
import { useInboxUnread } from '@/hooks/useInboxUnread'
import { badgeText } from '@/lib/request-inbox-ui'
import { CARD_BORDER, FOCUS_RING } from '@/components/admin/requests/ui'

/**
 * Slim shell for specialists who can view the request inbox but are not admins: one Requests link with the
 * unread badge, and a way back to the site. No admin navigation. (Admins get the full AdminShell instead.)
 */
export function StaffShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string | null }) {
  const unread = badgeText(useInboxUnread())

  return (
    <div className="min-h-screen bg-[#121113]">
      <header className={`border-b ${CARD_BORDER} bg-[#121113]`}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 md:px-6">
          <Link
            href="/admin/requests"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-base font-semibold text-[#59FFA0] ${FOCUS_RING}`}
          >
            Requests
            {unread && (
              <span
                className="min-w-[1.5rem] rounded-full bg-[#59FFA0] px-2 text-center text-sm font-bold leading-6 text-black"
                aria-label={`${unread} unread requests`}
              >
                {unread}
              </span>
            )}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4">
            {userEmail && <span className="break-all text-sm leading-5 text-[#7DD8E8]">{userEmail}</span>}
            <a
              href="/"
              className={`inline-flex min-h-[44px] items-center rounded-lg px-2 text-base text-[#1AC8ED] hover:underline ${FOCUS_RING}`}
            >
              ← Back to site
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">{children}</main>
    </div>
  )
}
