'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { lastData, usePackagePreview } from '@/hooks/usePackagePreview'
import { useRequestSubmit } from '@/hooks/useRequestSubmit'
import { formatLongDate, formatUsd, shortReference } from '@/lib/package-page-format'
import {
  EVENT_TYPE_MAX, NOTES_MAX, outcomeCopy, validateForm, type FormErrors, type RequestFormValues,
} from '@/lib/package-request-form'
import { buildReserveBody, initialReserveValues, normalizeGuestField, previewEventDate, previewGuests } from '@/lib/package-reserve-form'
import { clearResume, saveResume } from '@/lib/package-resume'
import { describeSelection, type SelectionState } from '@/lib/package-selection'
import { safeSessionStorage, setReturnTo } from '@/lib/return-to'
import type { LiveDocument, PublicReservation } from '@/lib/theme-package-public'
import { todayUtc } from '@/lib/theme-package-public-validation'
import { SheetDialogContent } from './SheetDialogContent'
import { primaryButtonClass } from './styles'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: LiveDocument
  initialValues: RequestFormValues
  /** Only used to keep the customize-mode selection safe across a sign-in round trip. */
  selection: SelectionState
  pageGuestCount: number
  onReload: () => Promise<boolean>
}

type View = { kind: 'form' } | { kind: 'confirmed'; requestId: string; duplicate: boolean; reservation: PublicReservation | null; eventDate: string }
type Banner = { text: string; reload?: boolean } | null

const EMPTY_SELECTION = { components: [] }
const labelClass = 'font-label mb-2 block text-xs tracking-widest text-text-secondary'
const fieldError = (msg?: string) => (msg ? <p role="alert" className="mt-1.5 text-sm text-red-400">{msg}</p> : null)

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-primary/70">{label}</dt>
      <dd className={strong ? 'font-[family-name:var(--font-playfair)] text-lg font-bold tabular-nums text-accent-primary' : 'tabular-nums text-text-primary'}>{value}</dd>
    </div>
  )
}

/** Money and dates come from the server's reservation numbers; nothing is calculated here. */
function ReservationNumbers({ r, eventDate }: { r: PublicReservation; eventDate?: string }) {
  const due = formatLongDate(r.balance_due_date)
  return (
    <dl className="space-y-1.5 text-sm">
      {r.total != null && <Row label="Total" value={formatUsd(r.total)} strong />}
      {r.deposit != null && r.deposit > 0 && <Row label="Deposit to reserve" value={formatUsd(r.deposit)} />}
      {r.balance != null && r.deposit != null && r.deposit > 0 && <Row label="Balance" value={formatUsd(r.balance)} />}
      {r.deposit != null && r.deposit > 0 && (due ? <Row label="Balance due" value={due} /> : !eventDate && <Row label="Balance due" value="Choose a date" />)}
    </dl>
  )
}

export function ReserveSheet({ open, onOpenChange, doc, initialValues, selection, pageGuestCount, onReload }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<RequestFormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [banner, setBanner] = useState<Banner>(null)
  const [view, setView] = useState<View>({ kind: 'form' })
  const { submitting, send } = useRequestSubmit(doc.key)
  const { min_guests: min, max_guests: max } = doc.meta

  const structured = doc.pricing?.mode === 'structured'
  const guestsForPreview = previewGuests(values.guestCount, min, max)
  const dateForPreview = previewEventDate(values.eventDate, todayUtc())
  const { state, retry } = usePackagePreview(doc.key, EMPTY_SELECTION, guestsForPreview, open && structured && view.kind === 'form', dateForPreview)
  const data = lastData(state)
  const reservation = data?.reservation ?? null
  const refreshing = state.status === 'loading'

  const set = <K extends keyof RequestFormValues>(k: K, v: RequestFormValues[K]) => setValues(prev => ({ ...prev, [k]: v }))

  const handleOpenChange = (next: boolean) => {
    if (!next && view.kind === 'confirmed') {
      setValues(initialReserveValues(doc))
      setErrors({})
      setBanner(null)
      setView({ kind: 'form' })
    }
    onOpenChange(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateForm(values, { today: todayUtc(), minGuests: min, maxGuests: max })
    setErrors(found)
    setBanner(null)
    if (Object.keys(found).length > 0) return

    const outcome = await send(buildReserveBody(doc, values))
    if (!outcome) return // a send is already in flight

    switch (outcome.kind) {
      case 'created':
        clearResume(safeSessionStorage(), doc.key)
        setView({ kind: 'confirmed', requestId: outcome.requestId, duplicate: false, reservation: outcome.reservation, eventDate: values.eventDate })
        break
      case 'duplicate':
        clearResume(safeSessionStorage(), doc.key)
        setView({ kind: 'confirmed', requestId: outcome.requestId, duplicate: true, reservation: null, eventDate: values.eventDate })
        break
      case 'sign_in': {
        const storage = safeSessionStorage()
        saveResume(storage, {
          v: 1,
          mode: 'reserve',
          packageKey: doc.key,
          versionId: doc.version_id,
          guestCount: pageGuestCount,
          selection: describeSelection(doc, selection),
          form: values,
          savedAt: Date.now(),
        })
        setReturnTo(storage, `/packages/${doc.key}`)
        router.push('/login')
        break
      }
      case 'invalid':
        if (outcome.field) setErrors({ [outcome.field]: outcome.message })
        else setBanner({ text: outcome.message })
        break
      case 'package_updated':
        setBanner({ text: outcomeCopy(outcome), reload: true })
        break
      default:
        setBanner({ text: outcomeCopy(outcome) })
    }
  }

  const reload = async () => {
    const ok = await onReload()
    setBanner({ text: ok ? 'Package reloaded. Check the details above, then send your request again.' : 'This package is no longer available.' })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <SheetDialogContent>
        {view.kind === 'confirmed' ? (
          <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-accent-primary" aria-hidden="true" />
            <DialogTitle className="text-2xl">{view.duplicate ? 'We already have this request' : 'Request saved'}</DialogTitle>
            <DialogDescription className="text-text-primary/70">
              {view.duplicate
                ? 'You sent a request for this package a moment ago, so we kept that one.'
                : `We’ve saved your request for ${formatLongDate(view.eventDate) ?? 'your date'}. Nothing is charged now; a deposit is only requested after your date is confirmed.`}
            </DialogDescription>
            {view.reservation?.mode === 'structured' && (
              <div className="w-full max-w-xs rounded-xl border border-border bg-background p-4 text-left">
                <ReservationNumbers r={view.reservation} eventDate={view.eventDate} />
              </div>
            )}
            <p className="text-sm text-text-primary/60">
              Reference <span className="font-mono text-text-primary">{shortReference(view.requestId)}</span>
            </p>
            <Button type="button" className={`${primaryButtonClass} mt-2`} onClick={() => handleOpenChange(false)}>
              Back to package
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-5">
              <div className="pr-10">
                <DialogTitle className="text-2xl">Reserve your date</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-text-primary/60">{doc.meta.title}</DialogDescription>
                <span className="font-label mt-2 inline-block rounded-full border border-accent-primary/40 px-2.5 py-0.5 text-[10px] tracking-widest text-accent-primary">
                  As curated
                </span>
              </div>

              <section aria-label="Your reservation summary" className="min-h-[7.5rem] rounded-xl border border-border bg-background p-4" aria-live="polite" aria-busy={refreshing}>
                {doc.pricing?.mode === 'free_text' ? (
                  <div className="space-y-2 text-sm">
                    {doc.pricing.free_text && <p className="whitespace-pre-line text-text-primary/80">{doc.pricing.free_text}</p>}
                    <p className="font-medium text-text-primary">A coordinator will confirm pricing.</p>
                  </div>
                ) : (
                  <div className={refreshing ? 'opacity-70' : undefined}>
                    <dl className="mb-1.5 text-sm">
                      <Row label="Guests" value={guestsForPreview != null ? String(guestsForPreview) : '—'} />
                    </dl>
                    {reservation?.mode === 'structured' ? (
                      <ReservationNumbers r={reservation} eventDate={dateForPreview ?? undefined} />
                    ) : (
                      <p className="text-sm text-text-primary/60">
                        {guestsForPreview == null ? 'Enter a guest count within the package range to see the numbers.' : refreshing ? 'Calculating…' : '—'}
                      </p>
                    )}
                    {state.status === 'rejected' && state.message && <p className="mt-2 text-sm text-red-300">{state.message}</p>}
                    {state.status === 'error' && (
                      <p className="mt-2 text-sm text-text-primary/70">
                        Couldn’t update the numbers.{' '}
                        <button type="button" className="min-h-11 text-accent-secondary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary" onClick={retry}>
                          Try again
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </section>

              {banner && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  <p>{banner.text}</p>
                  {banner.reload && (
                    <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={reload}>
                      Reload package
                    </Button>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="rs-date" className={labelClass}>Event date *</label>
                <Input
                  id="rs-date"
                  type="date"
                  min={todayUtc()}
                  value={values.eventDate}
                  onChange={e => set('eventDate', e.target.value)}
                  aria-invalid={!!errors.eventDate}
                  className="date-input-dark h-11"
                  style={{ colorScheme: 'dark' }}
                />
                {fieldError(errors.eventDate)}
              </div>

              <div>
                <label htmlFor="rs-guests" className={labelClass}>Guests *</label>
                <Input
                  id="rs-guests"
                  inputMode="numeric"
                  value={values.guestCount}
                  onChange={e => set('guestCount', e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                  onBlur={() => set('guestCount', normalizeGuestField(values.guestCount, min, max, pageGuestCount))}
                  aria-invalid={!!errors.guestCount}
                  className="h-11"
                />
                {fieldError(errors.guestCount)}
              </div>

              <div>
                <label htmlFor="rs-type" className={labelClass}>Event type</label>
                <Input
                  id="rs-type"
                  value={values.eventType}
                  maxLength={EVENT_TYPE_MAX}
                  onChange={e => set('eventType', e.target.value)}
                  aria-invalid={!!errors.eventType}
                  className="h-11"
                />
                {fieldError(errors.eventType)}
              </div>

              <div>
                <label htmlFor="rs-notes" className={labelClass}>Additional notes</label>
                <Textarea
                  id="rs-notes"
                  rows={4}
                  maxLength={NOTES_MAX}
                  value={values.notes}
                  onChange={e => set('notes', e.target.value)}
                  aria-invalid={!!errors.notes}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-text-primary/50">{values.notes.length}/{NOTES_MAX}</p>
                {fieldError(errors.notes)}
              </div>
            </div>

            <div className="border-t border-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <Button type="submit" disabled={submitting} className={`${primaryButtonClass} min-h-12 w-full`}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  'Request to reserve'
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetDialogContent>
    </Dialog>
  )
}
