'use client'

// Lives under the (staff) route group: the staff layout (events.requests.view) guards it, and every
// API route it calls enforces its own capability check. See app/(staff)/admin/layout.tsx.

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { INBOX_SCOPES, type InboxScope, type InboxStatus } from '@/lib/request-inbox-api'
import {
  SCOPE_LABELS, STATUS_OPTIONS, buildApiQuery, buildInboxQuery, hasNextPage, listState,
  parseInboxParams, statusLabel, type InboxView,
} from '@/lib/request-inbox-ui'
import { formatLongDate } from '@/lib/package-page-format'
import { CARD_BORDER, CONTROL_BORDER, FOCUS_RING, TAP } from '@/components/admin/requests/ui'

interface InboxRow {
  request_id: string
  type_label: string
  status: string
  title: string | null
  event_type: string | null
  event_date: string | null
  guest_count: string | null
  owner_name: string | null
  owner_id: string | null
  unread: boolean
}

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; forbidden: boolean }
  | { kind: 'ready'; rows: InboxRow[]; total: number }

const BUTTON = `${TAP} rounded-lg px-4 text-base font-medium ${FOCUS_RING}`

function RequestsInbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = parseInboxParams(new URLSearchParams(searchParams.toString()))
  const { scope, status, page } = view
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const go = useCallback((next: InboxView) => {
    router.replace(`/admin/requests${buildInboxQuery(next)}`, { scroll: false })
  }, [router])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ kind: 'loading' })
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/admin/requests?${buildApiQuery({ scope, status, page })}`, {
          cache: 'no-store',
          signal: ctrl.signal,
        })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.success) {
          setLoad({ kind: 'error', forbidden: res.status === 401 || res.status === 403 })
          return
        }
        setLoad({
          kind: 'ready',
          rows: Array.isArray(body.data?.requests) ? body.data.requests : [],
          total: Number(body.data?.total_count) || 0,
        })
      } catch {
        if (!ctrl.signal.aborted) setLoad({ kind: 'error', forbidden: false })
      }
    })()
    return () => ctrl.abort()
  }, [scope, status, page, attempt])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-1 font-header text-3xl font-bold text-white">Requests</h1>
        <p className="text-base leading-6 text-[#7DD8E8]">Plan My Event and package requests</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Request scope" className={`inline-flex rounded-lg border ${CONTROL_BORDER} bg-[#1a1a1a] p-1`}>
          {INBOX_SCOPES.map((s: InboxScope) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              onClick={() => go({ scope: s, status, page: 1 })}
              className={[
                `${TAP} rounded-md px-4 text-base transition-colors ${FOCUS_RING}`,
                // Selected is shown by weight and an underline as well as the tint, never by color alone.
                scope === s
                  ? 'bg-[#59FFA0]/15 font-bold text-[#59FFA0] underline decoration-2 underline-offset-4'
                  : 'font-medium text-[#7DD8E8] hover:text-white',
              ].join(' ')}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-base text-[#7DD8E8]">
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={e => go({ scope, status: (e.target.value || null) as InboxStatus | null, page: 1 })}
            className={`${TAP} rounded-md border ${CONTROL_BORDER} bg-[#1a1a1a] px-3 text-base text-white ${FOCUS_RING}`}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {load.kind === 'loading' && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading requests">
          {[0, 1, 2].map(i => <div key={i} className={`h-24 animate-pulse rounded-xl border ${CARD_BORDER} bg-[#1a1a1a]`} />)}
        </div>
      )}

      {load.kind === 'error' && (
        <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-6 text-center`}>
          <p className="mb-3 text-base leading-6 text-white">
            {load.forbidden ? "You don't have access to the request inbox." : 'Something went wrong loading requests.'}
          </p>
          {!load.forbidden && (
            <button type="button" onClick={() => setAttempt(a => a + 1)} className={`${BUTTON} bg-[#1AC8ED]/15 text-[#1AC8ED]`}>
              Try again
            </button>
          )}
        </div>
      )}

      {load.kind === 'ready' && (() => {
        const state = listState(load.rows.length, page)
        if (state === 'empty') {
          return <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-8 text-center text-base leading-6 text-[#7DD8E8]`}>No requests here yet.</div>
        }
        if (state === 'past_end') {
          return (
            <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-8 text-center`}>
              <p className="mb-3 text-base leading-6 text-[#7DD8E8]">No more results.</p>
              <button type="button" onClick={() => go({ scope, status, page: 1 })} className={`${BUTTON} bg-[#1AC8ED]/15 text-[#1AC8ED]`}>
                Back to first page
              </button>
            </div>
          )
        }
        return (
          <>
            <ul className="space-y-4">
              {load.rows.map(r => (
                <li key={r.request_id}>
                  <Link
                    href={`/admin/requests/${r.request_id}`}
                    className={`block rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-4 transition-colors hover:border-[#59FFA0]/40 ${FOCUS_RING}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <p className="min-w-0 break-words text-base font-semibold leading-6 text-white">{r.type_label}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {r.unread && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold leading-5 text-[#59FFA0]">
                            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#59FFA0]" />
                            Unread
                          </span>
                        )}
                        <span className="rounded-full bg-[#1AC8ED]/15 px-2.5 py-0.5 text-sm font-medium leading-5 text-[#1AC8ED]">
                          {statusLabel(r.status)}
                        </span>
                      </div>
                    </div>
                    {r.title && <p className="mt-1 break-words text-base leading-6 text-white/80">{r.title}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm leading-5 text-[#7DD8E8]">
                      {r.event_type && <span>{r.event_type}</span>}
                      <span>{formatLongDate(r.event_date) ?? 'No date'}</span>
                      <span>{r.guest_count ? `${r.guest_count} guests` : 'Guests not given'}</span>
                      <span>{r.owner_name ?? (r.owner_id ? 'Assigned' : 'Unassigned')}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-base text-[#7DD8E8]">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => go({ scope, status, page: page - 1 })}
                className={`${BUTTON} border ${CONTROL_BORDER} disabled:opacity-40`}
              >
                Previous
              </button>
              <span>Page {page} · {load.total} total</span>
              <button
                type="button"
                disabled={!hasNextPage(page, load.total)}
                onClick={() => go({ scope, status, page: page + 1 })}
                className={`${BUTTON} border ${CONTROL_BORDER} disabled:opacity-40`}
              >
                Next
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div className="text-base text-[#7DD8E8]">Loading…</div>}>
      <RequestsInbox />
    </Suspense>
  )
}
