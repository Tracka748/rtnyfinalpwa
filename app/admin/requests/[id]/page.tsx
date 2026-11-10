'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { contactCard, itemPriceText, statusLabel } from '@/lib/request-inbox-ui'
import { capitalizeFirst, formatLongDate, formatUsd } from '@/lib/package-page-format'
import { notifyInboxUnreadChanged } from '@/hooks/useInboxUnread'

interface PackageItem {
  name: string | null
  slot_label: string | null
  quantity: number | null
  price_status: string | null
  line_total: number | null
}
interface Reservation {
  mode?: string | null
  guest_count?: number | null
  extra_guests?: number | null
  extras_total?: number | null
  subtotal?: number | null
  service_charge?: number | null
  total?: number | null
  deposit?: number | null
  balance?: number | null
  balance_due_date?: string | null
}
interface Detail {
  id: string
  created_at: string
  status: string
  type_label: string
  event_type: string | null
  event_date: string | null
  guest_count: string | null
  budget_range: string | null
  estimated_total: number | null
  owner: { id: string; name: string | null } | null
  package: {
    title: string | null
    occasion: string | null
    version_number: number | null
    listed_subtotal: number | null
    unpriced_items: number | null
    items: PackageItem[]
    reservation: Reservation | null
    reservation_label: string
  } | null
  contact: unknown
}

type Load =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'error' }
  | { kind: 'ready'; detail: Detail }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-[#7DD8E8]">{label}</dt>
      <dd className="text-white text-right">{value}</dd>
    </div>
  )
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-[#1a1a1a] border border-white/10 p-5">
    <h2 className="font-header font-bold text-lg text-white mb-2">{title}</h2>
    {children}
  </section>
)

export default function AdminRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const markedFor = useRef<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ kind: 'loading' })
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/admin/requests/${encodeURIComponent(id)}`, { cache: 'no-store', signal: ctrl.signal })
        if (res.status === 404 || res.status === 400) { setLoad({ kind: 'not_found' }); return }
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.success || !body.data?.request) { setLoad({ kind: 'error' }); return }
        setLoad({ kind: 'ready', detail: body.data.request as Detail })

        // Read state is per user and enforced by the server: mark this request read once, then refresh the badge.
        if (markedFor.current !== id) {
          markedFor.current = id
          try {
            const r = await fetch(`/api/v1/admin/requests/${encodeURIComponent(id)}/read`, { method: 'POST', cache: 'no-store' })
            if (r.ok) notifyInboxUnreadChanged()
          } catch {
            // marking read is best effort
          }
        }
      } catch {
        if (!ctrl.signal.aborted) setLoad({ kind: 'error' })
      }
    })()
    return () => ctrl.abort()
  }, [id, attempt])

  const back = (
    <Link href="/admin/requests" className="inline-block mb-4 text-sm text-[#1AC8ED] hover:underline">← All requests</Link>
  )

  if (load.kind === 'loading') {
    return <div className="max-w-3xl mx-auto" aria-busy="true">{back}<div className="h-40 rounded-xl bg-[#1a1a1a] border border-white/10 animate-pulse" /></div>
  }
  if (load.kind === 'not_found') {
    return (
      <div className="max-w-3xl mx-auto">{back}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center text-white">
          This request wasn&apos;t found, or you don&apos;t have access to it.
        </div>
      </div>
    )
  }
  if (load.kind === 'error') {
    return (
      <div className="max-w-3xl mx-auto">{back}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-8 text-center">
          <p className="text-white mb-3">Something went wrong loading this request.</p>
          <button type="button" onClick={() => setAttempt(a => a + 1)} className="px-4 py-2 rounded-lg bg-[#1AC8ED]/15 text-[#1AC8ED] text-sm font-medium">Try again</button>
        </div>
      </div>
    )
  }

  const d = load.detail
  const pkg = d.package
  const res = pkg?.reservation
  const contact = contactCard(d.contact)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {back}

      <Card title={d.type_label}>
        <span className="inline-block mb-2 text-xs font-medium rounded-full px-2.5 py-0.5 bg-[#1AC8ED]/15 text-[#1AC8ED]">{statusLabel(d.status)}</span>
        <dl>
          {d.event_type && <Row label="Event" value={d.event_type} />}
          <Row label="Event date" value={formatLongDate(d.event_date) ?? 'Not given'} />
          <Row label="Guests" value={d.guest_count ?? 'Not given'} />
          {d.budget_range && <Row label="Budget" value={d.budget_range} />}
          {isNum(d.estimated_total) && <Row label="Estimated total" value={formatUsd(d.estimated_total)} />}
          <Row label="Owner" value={d.owner ? d.owner.name ?? 'Assigned' : 'Unassigned'} />
          <Row label="Received" value={new Date(d.created_at).toLocaleString()} />
        </dl>
      </Card>

      {pkg && (
        <Card title="Package">
          <p className="text-white">{pkg.title ?? 'Package'}</p>
          <p className="text-xs text-[#7DD8E8] mb-3">
            {[pkg.occasion, isNum(pkg.version_number) ? `Version ${pkg.version_number}` : null].filter(Boolean).join(' · ')}
          </p>
          <ul className="divide-y divide-white/10">
            {(pkg.items ?? []).map((it, i) => (
              <li key={i} className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-white min-w-0">
                  {it.name ?? 'Item'}
                  {it.slot_label && <span className="text-[#7DD8E8]"> · {it.slot_label}</span>}
                  {isNum(it.quantity) && it.quantity > 1 && <span className="text-[#7DD8E8]"> × {it.quantity}</span>}
                </span>
                <span className="text-white shrink-0">{itemPriceText(it)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 border-t border-white/10 pt-2">
            {isNum(pkg.listed_subtotal) && <Row label="Listed subtotal" value={formatUsd(pkg.listed_subtotal)} />}
            {isNum(pkg.unpriced_items) && pkg.unpriced_items > 0 && (
              <Row label="Priced on request" value={`${pkg.unpriced_items} item${pkg.unpriced_items === 1 ? '' : 's'}`} />
            )}
            {res && res.mode === 'structured' && (
              <>
                {isNum(res.extra_guests) && res.extra_guests > 0 && <Row label="Extra guests" value={res.extra_guests} />}
                {isNum(res.extras_total) && res.extras_total > 0 && <Row label="Extras" value={formatUsd(res.extras_total)} />}
                {isNum(res.service_charge) && <Row label="Service charge" value={formatUsd(res.service_charge)} />}
                {isNum(res.total) && <Row label={capitalizeFirst(pkg.reservation_label)} value={formatUsd(res.total)} />}
                {isNum(res.deposit) && <Row label="Deposit" value={formatUsd(res.deposit)} />}
                {isNum(res.balance) && <Row label="Balance" value={`${formatUsd(res.balance)}${res.balance_due_date ? ` due ${formatLongDate(res.balance_due_date) ?? ''}` : ''}`} />}
              </>
            )}
          </dl>
        </Card>
      )}

      <Card title="Contact">
        {contact.state === 'redacted' ? (
          <p className="text-sm text-[#7DD8E8]">Contact details are visible only to this request&apos;s owner.</p>
        ) : contact.rows.length === 0 ? (
          <p className="text-sm text-[#7DD8E8]">No contact details were provided.</p>
        ) : (
          <dl>
            {contact.rows.map(r => (
              <div key={r.label} className="py-1.5 text-sm">
                <dt className="text-[#7DD8E8]">{r.label}</dt>
                <dd className="text-white whitespace-pre-wrap break-words">
                  {r.value}
                  {r.note && <span className="ml-2 text-xs text-yellow-300">({r.note})</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  )
}
