'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRequestSubmit } from '@/hooks/useRequestSubmit'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatUsd, quoteLineNote, shortReference } from '@/lib/package-page-format'
import {
  buildRequestBody, EVENT_TYPE_MAX, initialFormValues, NOTES_MAX, outcomeCopy,
  validateForm, withPageGuestCount, type FormErrors, type RequestFormValues,
} from '@/lib/package-request-form'
import { clearResume, saveResume } from '@/lib/package-resume'
import { describeSelection, parseGuestInput, summarizeSelection, toRequestSelection, type SelectionState } from '@/lib/package-selection'
import { safeSessionStorage, setReturnTo } from '@/lib/return-to'
import type { LiveDocument, PublicSnapshot } from '@/lib/theme-package-public'
import { BUDGET_RANGES, todayUtc } from '@/lib/theme-package-public-validation'
import { SheetDialogContent } from './SheetDialogContent'
import { primaryButtonClass } from './styles'

const NOT_SURE = 'not-sure' // Radix Select items cannot have an empty value

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: LiveDocument
  selection: SelectionState
  guestCount: number
  snapshot: PublicSnapshot | null
  initialValues: RequestFormValues
  onGuestCountChange: (n: number) => void
  onReload: () => Promise<boolean>
}

type View = { kind: 'form' } | { kind: 'confirmed'; requestId: string; duplicate: boolean }
type Banner = { text: string; reload?: boolean } | null

const labelClass = 'font-label mb-2 block text-xs tracking-widest text-text-secondary'
const fieldError = (msg?: string) =>
  msg ? <p role="alert" className="mt-1.5 text-sm text-red-400">{msg}</p> : null

export function RequestSheet({ open, onOpenChange, doc, selection, guestCount, snapshot, initialValues, onGuestCountChange, onReload }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<RequestFormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [banner, setBanner] = useState<Banner>(null)
  const [view, setView] = useState<View>({ kind: 'form' })
  const { submitting, send } = useRequestSubmit(doc.key)

  // The guest field never keeps its own stale copy: every time the sheet opens it takes the page's
  // current guest count (clamped). It is deliberately keyed to `open` only, so edits made while the
  // sheet is open are not overwritten.
  useEffect(() => {
    if (open) setValues(v => withPageGuestCount(v, guestCount, doc.meta.min_guests, doc.meta.max_guests))
  }, [open])

  const set = <K extends keyof RequestFormValues>(k: K, v: RequestFormValues[K]) => setValues(prev => ({ ...prev, [k]: v }))
  const lines = summarizeSelection(doc, selection)
  const note = quoteLineNote(snapshot?.unpriced_items)

  const handleOpenChange = (next: boolean) => {
    if (!next && view.kind === 'confirmed') {
      // A finished request: the next time the sheet opens it is a fresh form.
      setValues(initialFormValues(doc, guestCount))
      setErrors({})
      setBanner(null)
      setView({ kind: 'form' })
    }
    onOpenChange(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateForm(values, { today: todayUtc(), minGuests: doc.meta.min_guests, maxGuests: doc.meta.max_guests })
    setErrors(found)
    setBanner(null)
    if (Object.keys(found).length > 0) return

    const outcome = await send(buildRequestBody(doc, toRequestSelection(doc, selection), values))
    if (!outcome) return // a send is already in flight

    switch (outcome.kind) {
      case 'created':
      case 'duplicate':
        clearResume(safeSessionStorage(), doc.key)
        setView({ kind: 'confirmed', requestId: outcome.requestId, duplicate: outcome.kind === 'duplicate' })
        break
      case 'sign_in': {
        const storage = safeSessionStorage()
        saveResume(storage, {
          v: 1,
          mode: 'quote',
          packageKey: doc.key,
          versionId: doc.version_id,
          guestCount,
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
    setBanner({ text: ok ? 'Package reloaded. Check your selection above, then send your request again.' : 'This package is no longer available.' })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <SheetDialogContent>
        {view.kind === 'confirmed' ? (
          <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-accent-primary" aria-hidden="true" />
            <DialogTitle className="text-2xl">{view.duplicate ? 'We already have this request' : 'Request received'}</DialogTitle>
            <DialogDescription className="text-text-primary/70">
              Your request has been saved with the details you gave us. You can close this and keep exploring.
            </DialogDescription>
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
                <DialogTitle className="text-2xl">Request a quote</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-text-primary/60">{doc.meta.title}</DialogDescription>
              </div>

              <section aria-label="Your configuration" className="rounded-xl border border-border bg-background p-4 text-sm">
                <ul className="space-y-1.5">
                  {lines.map(l => (
                    <li key={l.componentId} className="flex justify-between gap-3">
                      <span className="text-text-primary/70">
                        {l.slotLabel}
                        {l.quantity > 1 ? ` × ${l.quantity}` : ''}
                      </span>
                      <span className="text-right text-text-primary">
                        {l.name}
                        {l.swapped && <span className="ml-1 text-xs text-accent-secondary">(swapped)</span>}
                        {l.addOn && <span className="ml-1 text-xs text-accent-primary">(add-on)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="flex justify-between"><span className="text-text-primary/70">Guests</span><span>{guestCount}</span></p>
                  <p className="flex justify-between">
                    <span className="text-text-primary/70">Listed subtotal</span>
                    <span className="font-semibold tabular-nums text-accent-primary">
                      {snapshot?.listed_subtotal != null ? formatUsd(snapshot.listed_subtotal) : '—'}
                    </span>
                  </p>
                  {note && <p className="mt-1 text-xs text-text-primary/60">{note}</p>}
                </div>
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
                <label htmlFor="rq-date" className={labelClass}>Event date *</label>
                <Input
                  id="rq-date"
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
                <label htmlFor="rq-type" className={labelClass}>Event type</label>
                <Input
                  id="rq-type"
                  value={values.eventType}
                  maxLength={EVENT_TYPE_MAX}
                  onChange={e => set('eventType', e.target.value)}
                  aria-invalid={!!errors.eventType}
                  className="h-11"
                />
                {fieldError(errors.eventType)}
              </div>

              <div>
                <label htmlFor="rq-guests" className={labelClass}>Estimated guest count *</label>
                <Input
                  id="rq-guests"
                  inputMode="numeric"
                  value={values.guestCount}
                  onChange={e => set('guestCount', e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                  onBlur={() => {
                    const n = parseGuestInput(values.guestCount, guestCount)
                    if (n !== guestCount && n >= 1) onGuestCountChange(n)
                  }}
                  aria-invalid={!!errors.guestCount}
                  className="h-11"
                />
                {fieldError(errors.guestCount)}
              </div>

              <div>
                <label htmlFor="rq-budget" className={labelClass}>Budget range</label>
                <Select value={values.budgetRange === '' ? NOT_SURE : values.budgetRange} onValueChange={v => set('budgetRange', v === NOT_SURE ? '' : v)}>
                  <SelectTrigger id="rq-budget" className="w-full data-[size=default]:h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    <SelectItem value={NOT_SURE}>Not sure yet</SelectItem>
                    {BUDGET_RANGES.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError(errors.budgetRange)}
              </div>

              <div>
                <label htmlFor="rq-notes" className={labelClass}>Additional notes</label>
                <Textarea
                  id="rq-notes"
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
                  'Send request'
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetDialogContent>
    </Dialog>
  )
}
