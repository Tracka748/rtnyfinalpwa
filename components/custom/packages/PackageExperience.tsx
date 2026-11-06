'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActionBar } from './ActionBar'
import { CuratedView } from './CuratedView'
import { CustomizeView } from './CustomizeView'
import { RequestSheet } from './RequestSheet'
import { ReserveSheet } from './ReserveSheet'
import { useInlineCtaInView } from '@/hooks/useInlineCtaInView'
import { lastGood, usePackagePreview } from '@/hooks/usePackagePreview'
import {
  curatedBarText, customizeBarText, isCuratedSelection, primaryAction, showItemPrices, showStickyBar,
} from '@/lib/package-curated-view'
import { parseLiveDocumentResponse } from '@/lib/package-preview-client'
import { initialFormValues, withPageGuestCount, type RequestFormValues } from '@/lib/package-request-form'
import { initialReserveValues, normalizeGuestField } from '@/lib/package-reserve-form'
import { clearResume, loadResume } from '@/lib/package-resume'
import {
  clampGuestCount, defaultGuestCount, initialSelection, reconcileSelection, restoreSelection, swapOption,
  toRequestSelection, toggleOptional, type SelectionState,
} from '@/lib/package-selection'
import { safeSessionStorage } from '@/lib/return-to'
import type { LiveDocument, PublicSnapshotItem } from '@/lib/theme-package-public'

type Mode = 'curated' | 'customize'
type Sheet = 'reserve' | 'quote' | null

/**
 * The package page: a simple curated view with a Reserve flow, and the configurator as an optional
 * "Customize this experience" step on the same page. All state lives here so switching modes keeps
 * the selection.
 */
export function PackageExperience({ initialDoc }: { initialDoc: LiveDocument }) {
  const [doc, setDoc] = useState(initialDoc)
  const [selection, setSelection] = useState<SelectionState>(() => initialSelection(initialDoc))
  const [guests, setGuests] = useState(() => defaultGuestCount(initialDoc.meta.min_guests, initialDoc.meta.max_guests))
  const [mode, setMode] = useState<Mode>('curated')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [quoteSeed, setQuoteSeed] = useState<{ n: number; values: RequestFormValues }>(() => ({
    n: 0,
    values: initialFormValues(initialDoc, defaultGuestCount(initialDoc.meta.min_guests, initialDoc.meta.max_guests)),
  }))
  const [reserveSeed, setReserveSeed] = useState<{ n: number; values: RequestFormValues }>(() => ({
    n: 0,
    values: initialReserveValues(initialDoc),
  }))
  const [notice, setNotice] = useState<string | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const { ref: ctaRef, inView: ctaInView } = useInlineCtaInView()

  // Prices are needed in customize mode, and in the curated view only for packages without pricing terms.
  const needsPrices = doc.requestable && (mode === 'customize' || showItemPrices(doc))
  const previewSelection = useMemo(
    () => toRequestSelection(doc, mode === 'customize' ? selection : initialSelection(doc)),
    [doc, selection, mode]
  )
  const { state: preview, retry } = usePackagePreview(doc.key, previewSelection, guests, needsPrices)
  const snapshot = lastGood(preview)

  const linesByComponent = useMemo(() => {
    const map = new Map<string, PublicSnapshotItem>()
    for (const item of snapshot?.items ?? []) if (item.component_id) map.set(item.component_id, item)
    return map
  }, [snapshot])

  // Moving between the two views: back to the top, and focus the new heading for screen readers.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [mode])

  // Coming back from sign-in: reopen the sheet that was open (reserve or quote). The guest count always
  // comes from a clamped value, never from the saved string as is.
  useEffect(() => {
    const storage = safeSessionStorage()
    const saved = loadResume(storage, initialDoc.key)
    if (!saved) return
    clearResume(storage, initialDoc.key)
    const { min_guests: min, max_guests: max } = initialDoc.meta
    const n = clampGuestCount(saved.guestCount, min, max)
    if (saved.mode === 'reserve') {
      const guestCount = normalizeGuestField(saved.form.guestCount, min, max, n)
      setReserveSeed(prev => ({ n: prev.n + 1, values: { ...saved.form, guestCount, budgetRange: '' } }))
      setMode('curated')
      setSheet('reserve')
      if (saved.versionId !== initialDoc.version_id) setNotice('This package was updated while you were away. Check the details before you send your request.')
      return
    }
    const { state, lost } = restoreSelection(saved.selection, initialDoc)
    setSelection(state)
    setGuests(n)
    setQuoteSeed(prev => ({ n: prev.n + 1, values: withPageGuestCount(saved.form, n, min, max) }))
    setMode('customize')
    setSheet('quote')
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

  const action = primaryAction(doc)
  const onPrimary = () => {
    if (action.kind === 'reserve') setSheet('reserve')
    else if (action.kind === 'customize') setMode('customize')
  }

  const failed = preview.status === 'error' || preview.status === 'not_found'
  const rejected = preview.status === 'rejected'
  const customizeBar = customizeBarText({
    requestable: doc.requestable,
    status: preview.status,
    subtotal: snapshot?.listed_subtotal ?? null,
    unpriced: snapshot?.unpriced_items ?? null,
    rejectedMessage: preview.status === 'rejected' ? preview.message : undefined,
  })
  const curatedBar = curatedBarText(doc, snapshot ? { subtotal: snapshot.listed_subtotal, unpriced: snapshot.unpriced_items } : null)

  return (
    <>
      {notice && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div role="status" className="rounded-xl border border-accent-secondary/40 bg-accent-secondary/10 p-3 text-sm text-text-primary">
            {notice}
          </div>
        </div>
      )}

      {mode === 'curated' ? (
        <CuratedView
          doc={doc}
          linesByComponent={linesByComponent}
          selectionIsCurated={isCuratedSelection(doc, selection)}
          headingRef={headingRef}
          ctaRef={ctaRef}
          onPrimary={onPrimary}
          onCustomize={() => setMode('customize')}
        />
      ) : (
        <CustomizeView
          doc={doc}
          selection={selection}
          guests={guests}
          linesByComponent={linesByComponent}
          headingRef={headingRef}
          canGoBack
          onBack={() => setMode('curated')}
          onGuestsChange={setGuests}
          onToggle={id => setSelection(s => toggleOptional(s, doc, id))}
          onSwap={(id, optionId) => setSelection(s => swapOption(s, doc, id, optionId))}
        />
      )}

      {mode === 'curated' ? (
        <ActionBar
          visible={showStickyBar({ hasInlineCta: true, inView: ctaInView })}
          caption={curatedBar.caption}
          text={curatedBar.text}
          dim={showItemPrices(doc) && preview.status !== 'ready'}
          busy={showItemPrices(doc) && preview.status === 'loading'}
          action={{ label: action.label, sublabel: action.sublabel, disabled: action.disabled, onClick: onPrimary }}
        />
      ) : (
        <ActionBar
          caption="Listed subtotal"
          text={customizeBar.text}
          note={customizeBar.note}
          dim={customizeBar.dim}
          busy={preview.status === 'loading'}
          action={{ label: 'Request a quote', disabled: !(doc.requestable && preview.status === 'ready'), onClick: () => setSheet('quote') }}
          onRetry={(failed || rejected) && doc.requestable ? retry : undefined}
        />
      )}

      <ReserveSheet
        key={`reserve-${reserveSeed.n}`}
        open={sheet === 'reserve'}
        onOpenChange={open => setSheet(open ? 'reserve' : null)}
        doc={doc}
        initialValues={reserveSeed.values}
        selection={selection}
        pageGuestCount={guests}
        onReload={reloadPackage}
      />

      <RequestSheet
        key={`quote-${quoteSeed.n}`}
        open={sheet === 'quote'}
        onOpenChange={open => setSheet(open ? 'quote' : null)}
        doc={doc}
        selection={selection}
        guestCount={guests}
        snapshot={snapshot}
        initialValues={quoteSeed.values}
        onGuestCountChange={n => setGuests(clampGuestCount(n, doc.meta.min_guests, doc.meta.max_guests))}
        onReload={reloadPackage}
      />
    </>
  )
}
