'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { INBOX_SCOPES, type InboxScope, type InboxStatus } from '@/lib/request-inbox-api'
import {
  SCOPE_LABELS, STATUS_OPTIONS, buildApiQuery, buildInboxQuery, hasNextPage, listState,
  parseInboxParams, statusLabel, type InboxView,
} from '@/lib/request-inbox-ui'
import { formatLongDate } from '@/lib/package-page-format'

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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-header font-bold text-white mb-1">Requests</h1>
        <p className="text-[#7DD8E8] text-sm">Plan My Event and package requests</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div role="tablist" aria-label="Request scope" className="inline-flex rounded-lg bg-[#1a1a1a] p-1 border border-white/10">
          {INBOX_SCOPES.map((s: InboxScope) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              onClick={() => go({ scope: s, status, page: 1 })}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                scope === s ? 'bg-[#59FFA0]/15 text-[#59FFA0]' : 'text-[#7DD8E8] hover:text-white',
              ].join(' ')}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-[#7DD8E8]">
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={e => go({ scope, status: (e.target.value || null) as InboxStatus | null, page: 1 })}
            className="bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-1.5 text-white text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {load.kind === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading requests">
          {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-[#1a1a1a] border border-white/10 animate-pulse" />)}
        </div>
      )}

      {load.kind === 'error' && (
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center">
          <p className="text-white mb-3">
            {load.forbidden ? "You don't have access to the request inbox." : 'Something went wrong loading requests.'}
          </p>
          {!load.forbidden && (
            <button type="button" onClick={() => setAttempt(a => a + 1)} className="px-4 py-2 rounded-lg bg-[#1AC8ED]/15 text-[#1AC8ED] text-sm font-medium">
              Try again
            </button>
          )}
        </div>
      )}

      {load.kind === 'ready' && (() => {
        const state = listState(load.rows.length, page)
        if (state === 'empty') {
          return <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center text-[#7DD8E8]">No requests here yet.</div>
        }
        if (state === 'past_end') {
          return (
            <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center">
              <p className="text-[#7DD8E8] mb-3">No more results.</p>
              <button type="button" onClick={() => go({ scope, status, page: 1 })} className="px-4 py-2 rounded-lg bg-[#1AC8ED]/15 text-[#1AC8ED] text-sm font-medium">
                Back to first page
              </button>
            </div>
          )
        }
        return (
          <>
            <ul className="space-y-3">
              {load.rows.map(r => (
                <li key={r.request_id}>
                  <Link
                    href={`/admin/requests/${r.request_id}`}
                    className="block rounded-xl bg-[#1a1a1a] border border-white/10 hover:border-[#59FFA0]/40 transition-colors p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={['mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', r.unread ? 'bg-[#59FFA0]' : 'bg-transparent'].join(' ')}
                        aria-label={r.unread ? 'Unread' : undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-white truncate">{r.type_label}</p>
                          <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-[#1AC8ED]/15 text-[#1AC8ED]">
                            {statusLabel(r.status)}
                          </span>
                        </div>
                        {r.title && <p className="text-sm text-white/80 truncate">{r.title}</p>}
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7DD8E8]">
                          {r.event_type && <span>{r.event_type}</span>}
                          <span>{formatLongDate(r.event_date) ?? 'No date'}</span>
                          <span>{r.guest_count ? `${r.guest_count} guests` : 'Guests not given'}</span>
                          <span>{r.owner_name ?? (r.owner_id ? 'Assigned' : 'Unassigned')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between text-sm text-[#7DD8E8]">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => go({ scope, status, page: page - 1 })}
                className="px-4 py-2 rounded-lg border border-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {page} · {load.total} total</span>
              <button
                type="button"
                disabled={!hasNextPage(page, load.total)}
                onClick={() => go({ scope, status, page: page + 1 })}
                className="px-4 py-2 rounded-lg border border-white/10 disabled:opacity-40"
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
    <Suspense fallback={<div className="text-[#7DD8E8]">Loading…</div>}>
      <RequestsInbox />
    </Suspense>
  )
}
