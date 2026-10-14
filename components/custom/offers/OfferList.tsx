'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OfferRecord, WizardMode } from './types'
import { offerPriceDisplay } from './types'
import { OfferStatusBadge } from './OfferStatusBadge'
import { FormBanner, type BannerState } from './FormBanner'
import { ActionSheet, RequestChangesSheet } from './ActionSheet'
import { deleteOffer, messageForStatus, patchOffer, type OfferAction } from './offerApi'
import { cardClass, priceFontClass, text } from './styles'

interface OfferListProps {
  partnerId: string
  // Wizard route; existing offers open at `${wizardHref}?offer=<id>`.
  wizardHref: string
  // 'admin' adds Approve / Request changes / Deactivate quick actions.
  mode: WizardMode
}

export function NewOfferButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 px-5 rounded-xl bg-[#59FFA0] text-[#121113] font-header font-bold text-base hover:bg-[#59FFA0]/90 transition-colors"
    >
      <Plus className="w-4 h-4" />
      New birthday offer
    </a>
  )
}

const DELETABLE = new Set(['draft', 'needs_changes'])

const actionButton =
  'min-h-12 px-4 rounded-xl font-sans text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

export function OfferList({ partnerId, wizardHref, mode }: OfferListProps) {
  const [offers, setOffers] = useState<OfferRecord[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OfferRecord | null>(null)
  const [changesTarget, setChangesTarget] = useState<OfferRecord | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<OfferRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1/partners/${partnerId}/offers`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setLoadError(messageForStatus(res.status, json.error, 'load'))
          setOffers([])
          return
        }
        setOffers((json.data as OfferRecord[]) ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(messageForStatus(0, undefined, 'load'))
        setOffers([])
      })
    return () => {
      cancelled = true
    }
  }, [partnerId])

  const replaceOffer = (updated: OfferRecord) =>
    setOffers((list) => (list ? list.map((o) => (o.id === updated.id ? updated : o)) : list))

  async function runAction(offer: OfferRecord, action: Extract<OfferAction, 'approve' | 'request_changes' | 'deactivate'>, note?: string) {
    setBanner(null)
    setBusyId(offer.id)
    const result = await patchOffer(partnerId, offer.id, {
      action,
      ...(action === 'request_changes' ? { review_note: note } : {}),
    })
    setBusyId(null)
    if (!result.ok) {
      setBanner({ type: 'error', message: messageForStatus(result.status, result.error, 'review') })
      return
    }
    replaceOffer(result.data)
    const done = {
      approve: `“${offer.title}” is approved and live.`,
      request_changes: `“${offer.title}” was sent back with your note.`,
      deactivate: `“${offer.title}” was deactivated and is back to draft.`,
    }[action]
    setBanner({ type: 'success', message: done })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setBanner(null)
    setBusyId(target.id)
    const result = await deleteOffer(partnerId, target.id)
    setBusyId(null)
    setDeleteTarget(null)
    if (!result.ok) {
      setBanner({ type: 'error', message: messageForStatus(result.status, result.error, 'delete') })
      return
    }
    setOffers((list) => (list ? list.filter((o) => o.id !== target.id) : list))
    setBanner({ type: 'success', message: `“${target.title}” was deleted.` })
  }

  if (offers === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError) return <FormBanner banner={{ type: 'error', message: loadError }} />

  return (
    <div className="space-y-4">
      <FormBanner banner={banner} />

      {offers.length === 0 ? (
        <div className={`${cardClass} p-8 text-center space-y-4`}>
          <div className="space-y-1">
            <p className="font-header text-xl font-bold text-white">No birthday offers yet</p>
            <p className={text.helper}>Build your first one in a few minutes. It stays a draft until you submit it.</p>
          </div>
          <NewOfferButton href={wizardHref} />
        </div>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => {
            const { price, qualifier } = offerPriceDisplay(offer)
            const busy = busyId === offer.id
            const canDelete = DELETABLE.has(offer.status)
            const adminPending = mode === 'admin' && offer.status === 'pending'
            const adminActive = mode === 'admin' && offer.status === 'active'
            return (
              <li key={offer.id} className={cn(cardClass, 'overflow-hidden')}>
                <a
                  href={`${wizardHref}${wizardHref.includes('?') ? '&' : '?'}offer=${offer.id}`}
                  className="flex items-center gap-4 p-4 min-h-12 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-header text-lg font-bold text-white break-words min-w-0">{offer.title}</p>
                      <OfferStatusBadge status={offer.status} />
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-lg font-bold text-[#59FFA0] tabular-nums ${priceFontClass}`}>{price}</span>
                      {qualifier && <span className={text.helper}>{qualifier}</span>}
                    </div>
                    {offer.status === 'needs_changes' && offer.review_note && (
                      <p className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-base text-red-300 font-sans break-words">
                        <span className="font-semibold">Reviewer note: </span>
                        {offer.review_note}
                      </p>
                    )}
                    <p className={text.helper}>
                      Updated{' '}
                      {new Date(offer.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 text-white/60" aria-hidden="true" />
                </a>

                {(canDelete || adminPending || adminActive) && (
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    {adminPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => runAction(offer, 'approve')}
                          disabled={busy}
                          className={cn(actionButton, 'bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setChangesTarget(offer)}
                          disabled={busy}
                          className={cn(actionButton, 'border border-red-400/60 text-red-300 hover:bg-red-500/10')}
                        >
                          Request changes
                        </button>
                      </>
                    )}
                    {adminActive && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(offer)}
                        disabled={busy}
                        className={cn(actionButton, 'border border-red-400/60 text-red-300 hover:bg-red-500/10')}
                      >
                        Deactivate
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(offer)}
                        disabled={busy}
                        className={cn(actionButton, 'border border-white/20 text-white/85 hover:border-red-400/60 hover:text-red-300')}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ActionSheet
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this offer?"
        description={deleteTarget ? `“${deleteTarget.title}” will be removed for good. This can’t be undone.` : undefined}
        confirmLabel="Delete"
        tone="danger"
        busy={!!deleteTarget && busyId === deleteTarget.id}
        onConfirm={confirmDelete}
      />

      <RequestChangesSheet
        open={!!changesTarget}
        onOpenChange={(open) => !open && setChangesTarget(null)}
        offerTitle={changesTarget?.title}
        busy={!!changesTarget && busyId === changesTarget.id}
        onSubmit={async (note) => {
          if (!changesTarget) return
          await runAction(changesTarget, 'request_changes', note)
          setChangesTarget(null)
        }}
      />

      <ActionSheet
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this offer?"
        description="It comes off the public site right away and goes back to draft. The partner can edit and resubmit it."
        confirmLabel="Deactivate"
        tone="danger"
        busy={!!deactivateTarget && busyId === deactivateTarget.id}
        onConfirm={async () => {
          if (!deactivateTarget) return
          await runAction(deactivateTarget, 'deactivate')
          setDeactivateTarget(null)
        }}
      />
    </div>
  )
}
