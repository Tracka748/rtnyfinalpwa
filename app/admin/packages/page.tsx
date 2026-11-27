'use client'

import { useCallback, useEffect, useState } from 'react'
import { NewPackageForm } from '@/components/admin/NewPackageForm'
import { BODY, CARD_BORDER, CONTROL_BORDER, FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'
import {
  EDIT_EXPLAINER, NETWORK_ERROR, canStartDraft, liveLabel, openLabel, parsePackagePage, startDraftError,
  type PackageRow,
} from '@/lib/admin-package-ui'

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; rows: PackageRow[] }

const BTN = `${TAP} touch-manipulation rounded-lg px-4 ${BODY} font-medium ${FOCUS_RING}`
const MAX_PAGES = 50

async function loadAll(archived: boolean, signal: AbortSignal): Promise<PackageRow[] | null> {
  const rows: PackageRow[] = []
  let offset = 0
  for (let i = 0; i < MAX_PAGES; i++) {
    const qs = new URLSearchParams({ status: archived ? 'archived' : 'active' })
    if (offset > 0) qs.set('offset', String(offset))
    const res = await fetch(`/api/v1/admin/packages?${qs}`, { cache: 'no-store', signal })
    if (!res.ok) return null
    const page = parsePackagePage(await res.json().catch(() => null))
    if (!page) return null
    rows.push(...page.rows)
    if (page.nextOffset === null) return rows
    offset = page.nextOffset
  }
  return rows
}

export default function AdminPackagesPage() {
  const [archived, setArchived] = useState(false)
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [reloadTick, setReloadTick] = useState(0)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowMessage, setRowMessage] = useState<{ id: string; text: string; error: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ kind: 'loading' })
    ;(async () => {
      try {
        const rows = await loadAll(archived, ctrl.signal)
        if (ctrl.signal.aborted) return
        setLoad(rows ? { kind: 'ready', rows } : { kind: 'error' })
      } catch {
        if (!ctrl.signal.aborted) setLoad({ kind: 'error' })
      }
    })()
    return () => ctrl.abort()
  }, [archived, reloadTick])

  const reload = useCallback(() => setReloadTick(t => t + 1), [])

  async function startDraft(p: PackageRow) {
    if (busyId) return
    setBusyId(p.id)
    setRowMessage(null)
    try {
      const res = await fetch(`/api/v1/admin/packages/${p.id}/versions`, { method: 'POST' })
      if (res.ok) {
        setRowMessage({ id: p.id, text: 'Draft started. The editor opens from this list in a later update.', error: false })
        reload()
      } else {
        setRowMessage({ id: p.id, text: startDraftError(res.status, await res.json().catch(() => null)), error: true })
        if (res.status === 409) reload()
      }
    } catch {
      setRowMessage({ id: p.id, text: NETWORK_ERROR, error: true })
    }
    setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-slab-serif font-bold text-white">Packages</h1>
        <p className={`${BODY} max-w-prose text-[#7DD8E8]`}>Curated theme packages and their versions.</p>
      </div>

      <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-4`}>
        <p className={`${SECONDARY} max-w-prose break-words text-[#7DD8E8]`}>{EDIT_EXPLAINER}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className={`inline-flex ${TAP} items-center gap-3 ${BODY} text-white`}>
          <input
            type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}
            className={`h-5 w-5 accent-[#59FFA0] ${FOCUS_RING}`}
          />
          Show archived packages
        </label>
        {!creating && (
          <button type="button" onClick={() => { setCreating(true); setNotice(null) }} className={`${BTN} bg-[#59FFA0] text-[#121113]`}>
            New package
          </button>
        )}
      </div>

      <div aria-live="polite">
        {notice && <p className={`${BODY} break-words text-[#59FFA0]`}>{notice}</p>}
      </div>

      {creating && (
        <NewPackageForm
          onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); setNotice('Package created with its first draft.'); reload() }}
        />
      )}

      {load.kind === 'loading' && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading packages">
          {[0, 1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />)}
        </div>
      )}

      {load.kind === 'error' && (
        <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-6`}>
          <p className={`mb-3 ${BODY} text-white`}>Something went wrong loading packages.</p>
          <button type="button" onClick={reload} className={`${BTN} border ${CONTROL_BORDER} text-white hover:bg-white/10`}>Try again</button>
        </div>
      )}

      {load.kind === 'ready' && load.rows.length === 0 && (
        <div className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-8 text-center ${BODY} text-[#7DD8E8]`}>
          {archived ? 'No archived packages.' : 'No packages yet.'}
        </div>
      )}

      {load.kind === 'ready' && load.rows.length > 0 && (
        <ul className="space-y-4">
          {load.rows.map(p => (
            <li key={p.id} className={`rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-all text-lg font-semibold text-white">{p.key}</h2>
                  <p className={`${SECONDARY} break-words text-[#7DD8E8]`}>
                    {p.occasion}{p.theme_name ? ` · Theme: ${p.theme_name}` : ' · No theme'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === 'archived' && (
                    <span className={`rounded-full border border-white/40 px-2.5 py-0.5 ${SECONDARY} font-medium text-white`}>Archived</span>
                  )}
                  {p.open_version && (
                    <span className={`rounded-full bg-[#1AC8ED]/15 px-2.5 py-0.5 ${SECONDARY} font-medium text-[#1AC8ED]`}>
                      {openLabel(p.open_version.status)}
                    </span>
                  )}
                </div>
              </div>

              <dl className={`mt-3 space-y-1 ${SECONDARY} text-white`}>
                <div className="break-words"><dt className="inline text-[#7DD8E8]">Live: </dt><dd className="inline">{liveLabel(p)}</dd></div>
                <div className="break-words">
                  <dt className="inline text-[#7DD8E8]">Open draft: </dt>
                  <dd className="inline">
                    {p.open_version ? `${openLabel(p.open_version.status)}${p.open_version.title ? `, ${p.open_version.title}` : ''}` : 'None'}
                  </dd>
                </div>
                <div><dt className="inline text-[#7DD8E8]">Versions: </dt><dd className="inline">{p.version_count}</dd></div>
              </dl>

              {canStartDraft(p) && (
                <div className="mt-4">
                  <button
                    type="button" onClick={() => startDraft(p)} disabled={busyId !== null}
                    className={`${BTN} w-full border ${CONTROL_BORDER} text-white hover:bg-white/10 disabled:opacity-60 sm:w-auto`}
                  >
                    {busyId === p.id ? 'Starting…' : 'Start a new draft'}
                  </button>
                </div>
              )}

              <div aria-live="polite">
                {rowMessage?.id === p.id && (
                  <p className={`mt-3 ${SECONDARY} break-words ${rowMessage.error ? 'text-red-300' : 'text-[#59FFA0]'}`}>{rowMessage.text}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
