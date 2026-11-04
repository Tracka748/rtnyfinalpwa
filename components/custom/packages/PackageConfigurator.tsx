'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GuestCountControl } from './GuestCountControl'
import { ComponentCard } from './ComponentCard'
import { PriceBar } from './PriceBar'
import { RequestSheet } from './RequestSheet'
import { lastGood, usePackagePreview } from '@/hooks/usePackagePreview'
import { describeLine } from '@/lib/package-page-format'
import { parseLiveDocumentResponse } from '@/lib/package-preview-client'
import { initialFormValues, withPageGuestCount, type RequestFormValues } from '@/lib/package-request-form'
import { clearResume, loadResume } from '@/lib/package-resume'
import {
  clampGuestCount, defaultGuestCount, initialSelection, reconcileSelection, restoreSelection, selectedOption,
  swapOption, toRequestSelection, toggleOptional, type SelectionState,
} from '@/lib/package-selection'
import { safeSessionStorage } from '@/lib/return-to'
import type { LiveDocument, PublicSnapshotItem } from '@/lib/theme-package-public'

export function PackageConfigurator({ initialDoc }: { initialDoc: LiveDocument }) {
  const [doc, setDoc] = useState(initialDoc)
  const [selection, setSelection] = useState<SelectionState>(() => initialSelection(initialDoc))
  const [guests, setGuests] = useState(() => defaultGuestCount(initialDoc.meta.min_guests, initialDoc.meta.max_guests))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formSeed, setFormSeed] = useState<{ n: number; values: RequestFormValues }>(() => ({
    n: 0,
    values: initialFormValues(initialDoc, defaultGuestCount(initialDoc.meta.min_guests, initialDoc.meta.max_guests)),
  }))
  const [notice, setNotice] = useState<string | null>(null)

  const requestSelection = useMemo(() => toRequestSelection(doc, selection), [doc, selection])
  const { state: preview, retry } = usePackagePreview(doc.key, requestSelection, guests, doc.requestable)
  const snapshot = lastGood(preview)

  const linesByComponent = useMemo(() => {
    const map = new Map<string, PublicSnapshotItem>()
    for (const item of snapshot?.items ?? []) if (item.component_id) map.set(item.component_id, item)
    return map
  }, [snapshot])

  // Coming back from sign-in: restore the selection and form and reopen the sheet (the user presses send
  // again). The guest count always comes from the clamped page value, never from the saved string.
  useEffect(() => {
    const storage = safeSessionStorage()
    const saved = loadResume(storage, initialDoc.key)
    if (!saved) return
    clearResume(storage, initialDoc.key)
    const { state, lost } = restoreSelection(saved.selection, initialDoc)
    const n = clampGuestCount(saved.guestCount, initialDoc.meta.min_guests, initialDoc.meta.max_guests)
    setSelection(state)
    setGuests(n)
    setFormSeed(prev => ({
      n: prev.n + 1,
      values: withPageGuestCount(saved.form, n, initialDoc.meta.min_guests, initialDoc.meta.max_guests),
    }))
    setSheetOpen(true)
    if (lost > 0 || saved.versionId !== initialDoc.version_id) {
      setNotice('Some of your choices changed because the package was updated while you were away.')
    }
  }, [initialDoc])

  const reloadPackage = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/theme-packages/${encodeURIComponent(doc.key)}`, { cache: 'no-store' })
      if (!res.ok) return false
      const fresh = parseLiveDocumentResponse(await res.json())
      if (!fresh) return false
      const { state, lost } = reconcileSelection(doc, selection, fresh)
      setDoc(fresh)
      setSelection(state)
      setGuests(g => clampGuestCount(g, fresh.meta.min_guests, fresh.meta.max_guests))
      setNotice(lost > 0 ? 'Some of your choices changed because the package was updated.' : 'This package was updated. Your choices were kept.')
      return true
    } catch {
      return false
    }
  }, [doc, selection])

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-40 pt-6">
        {notice && (
          <div role="status" className="rounded-xl border border-accent-secondary/40 bg-accent-secondary/10 p-3 text-sm text-text-primary">
            {notice}
          </div>
        )}
        {!doc.requestable && (
          <div role="status" className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary/80">
            This package can’t be requested right now because part of it is unavailable.
          </div>
        )}

        <GuestCountControl value={guests} min={doc.meta.min_guests} max={doc.meta.max_guests} onChange={setGuests} />

        <h2 className="font-header pt-2 text-2xl font-bold">What’s included</h2>
        <ul className="space-y-3">
          {doc.components.map(c => {
            const choice = selection[c.id]
            if (!choice) return null
            const opt = selectedOption(doc, selection, c.id)
            const item = linesByComponent.get(c.id)
            return (
              <ComponentCard
                key={c.id}
                component={c}
                choice={choice}
                line={describeLine(item, opt?.pricing ?? { treatment: 'quote', price: null, pricing_model: null })}
                guestFit={item?.guest_fit ?? null}
                groupSize={guests}
                onToggle={() => setSelection(s => toggleOptional(s, doc, c.id))}
                onSwap={optionId => setSelection(s => swapOption(s, doc, c.id, optionId))}
              />
            )
          })}
        </ul>
      </div>

      <PriceBar state={preview} requestable={doc.requestable} onRequest={() => setSheetOpen(true)} onRetry={retry} />

      <RequestSheet
        key={formSeed.n}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        doc={doc}
        selection={selection}
        guestCount={guests}
        snapshot={snapshot}
        initialValues={formSeed.values}
        onGuestCountChange={n => setGuests(clampGuestCount(n, doc.meta.min_guests, doc.meta.max_guests))}
        onReload={reloadPackage}
      />
    </>
  )
}
