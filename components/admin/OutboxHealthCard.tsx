'use client'

// Admin-only delivery health for request emails. Counts only; the requeue asks to confirm first.
import { useCallback, useEffect, useState } from 'react'
import { BODY, CARD_BORDER, CONTROL_BORDER, FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'
import { requeueSummary, type HealthView } from '@/lib/outbox-health'

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; view: HealthView }
type Confirm = null | { mode: 'failed'; ids: string[] } | { mode: 'app_url'; count: number }

const CHIP: Record<HealthView['status'], { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'bg-[#59FFA0]/15 text-[#59FFA0] border-[#59FFA0]/50' },
  degraded: { label: 'Needs attention', cls: 'bg-yellow-400/15 text-yellow-300 border-yellow-300/50' },
  stalled: { label: 'Stalled', cls: 'bg-red-500/15 text-red-300 border-red-300/50' },
}
const BTN = `${TAP} ${FOCUS_RING} px-4 rounded-lg border ${CONTROL_BORDER} ${BODY} text-white hover:bg-white/10 disabled:opacity-50`
const PRIMARY = `${TAP} ${FOCUS_RING} px-4 rounded-lg ${BODY} font-semibold bg-[#59FFA0] text-[#121113] disabled:opacity-50`

export function OutboxHealthCard() {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/notifications/health', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) { setLoad({ state: 'error' }); return }
      setLoad({ state: 'ready', view: json.data.health as HealthView })
    } catch {
      setLoad({ state: 'error' })
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function requeue() {
    if (!confirm) return
    setBusy(true)
    setMessage(null)
    try {
      const body = confirm.mode === 'failed' ? { mode: 'failed', ids: confirm.ids } : { mode: 'app_url' }
      const res = await fetch('/api/v1/admin/notifications/requeue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
      })
      const json = await res.json().catch(() => null)
      setMessage(res.ok && json?.success ? requeueSummary(json.data) : 'The requeue did not go through. Try again.')
    } catch {
      setMessage('The requeue did not go through. Try again.')
    } finally {
      setBusy(false)
      setConfirm(null)
      void refresh()
    }
  }

  return (
    <div className={`bg-[#1a1a1a] border ${CARD_BORDER} rounded-xl p-4 md:p-6 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-header font-bold text-white">Request emails</h3>
          {load.state === 'ready' && (
            <span className={`${SECONDARY} px-3 py-1 rounded-full border ${CHIP[load.view.status].cls}`}>
              {CHIP[load.view.status].label}
            </span>
          )}
        </div>
        <button type="button" onClick={() => void refresh()} className={BTN}>Refresh</button>
      </div>

      {load.state === 'loading' && <p className={`${BODY} text-[#B8B8B8]`}>Loading delivery health…</p>}
      {load.state === 'error' && <p className={`${BODY} text-red-300`}>Delivery health is not available right now.</p>}

      {load.state === 'ready' && (() => {
        const v = load.view
        return (
          <>
            {v.reasons.length > 0 && (
              <ul className={`${BODY} text-white list-disc pl-5 space-y-1`}>
                {v.reasons.map(r => <li key={r}>{r}</li>)}
              </ul>
            )}
            {v.notes.map(n => <p key={n} className={`${SECONDARY} text-[#B8B8B8]`}>{n}</p>)}

            {v.isEmpty ? (
              <p className={`${BODY} text-[#B8B8B8]`}>No request emails in the last 7 days.</p>
            ) : (
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {([
                  ['Waiting to send', v.counts.pending], ['Sending now', v.counts.sending], ['Sent (24 hours)', v.counts.sent24h],
                  ['Failed (7 days)', v.counts.failed7d], ['Skipped (7 days)', v.counts.skipped7d],
                ] as const).map(([label, n]) => (
                  <div key={label} className={`border ${CARD_BORDER} rounded-lg p-3`}>
                    <dt className={`${SECONDARY} text-[#B8B8B8]`}>{label}</dt>
                    <dd className="text-2xl font-bold text-white">{n}</dd>
                  </div>
                ))}
                <div className={`border ${CARD_BORDER} rounded-lg p-3`}>
                  <dt className={`${SECONDARY} text-[#B8B8B8]`}>Oldest waiting</dt>
                  <dd className="text-2xl font-bold text-white">{v.oldestDuePending ?? 'None'}</dd>
                </div>
              </dl>
            )}

            {v.failures.length > 0 && (
              <div>
                <h4 className={`${BODY} font-semibold text-white mb-2`}>Failures in the last 7 days</h4>
                <ul className="space-y-1">
                  {v.failures.map(f => (
                    <li key={f.code} className={`${BODY} text-white flex justify-between gap-3`}>
                      <span>{f.label}</span><span className="font-semibold">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {confirm === null && (
              <div className="flex flex-wrap gap-3">
                {v.requeueIds.length > 0 && (
                  <button type="button" className={BTN} onClick={() => setConfirm({ mode: 'failed', ids: v.requeueIds })}>
                    Requeue failed emails…
                  </button>
                )}
                {v.appUrlWaiting > 0 && (
                  <button type="button" className={BTN} onClick={() => setConfirm({ mode: 'app_url', count: v.appUrlWaiting })}>
                    Retry emails waiting on the app URL…
                  </button>
                )}
              </div>
            )}

            {confirm !== null && (
              <div role="alertdialog" aria-label="Confirm requeue" className={`border ${CONTROL_BORDER} rounded-lg p-4 space-y-3`}>
                <p className={`${BODY} text-white`}>
                  {confirm.mode === 'failed'
                    ? `Requeue ${confirm.ids.length} failed email${confirm.ids.length === 1 ? '' : 's'}? They are retried within about a minute. Emails for closed requests are skipped.`
                    : `Retry ${Math.min(confirm.count, 100)} of ${confirm.count} email${confirm.count === 1 ? '' : 's'} waiting on the app URL? Only do this after NEXT_PUBLIC_APP_URL is set in Vercel.`}
                </p>
                {confirm.mode === 'failed' && v.requeueCount > confirm.ids.length && (
                  <p className={`${SECONDARY} text-[#B8B8B8]`}>Up to 100 per click; {v.requeueCount} in total.</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={PRIMARY} disabled={busy} onClick={() => void requeue()}>
                    {busy ? 'Requeuing…' : confirm.mode === 'failed' ? `Requeue ${confirm.ids.length}` : 'Retry now'}
                  </button>
                  {/* Focus starts on Cancel so Enter or Space never confirms by accident. */}
                  <button type="button" className={BTN} disabled={busy} autoFocus onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )
      })()}

      <p role="status" aria-live="polite" className={`${BODY} text-white`}>{message ?? ''}</p>
    </div>
  )
}
