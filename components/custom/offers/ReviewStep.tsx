'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS, STEP } from '@/hooks/useOfferWizard'
import type { CategoryConfig } from './categoryFields'
import type { OfferRecord, WizardMode } from './types'
import { formatPrice } from './types'
import {
  addOnList,
  availabilitySummary,
  detailText,
  groupSizeWording,
  perkSummary,
  priceWording,
  requirementSummary,
  submitChecklist,
} from './offerReview'
import { OfferImageUpload, removeOfferImage } from './OfferImageUpload'
import { OfferStatusBadge } from './OfferStatusBadge'
import { SectionCard } from './SectionCard'
import { cardClass, priceFontClass, space, text } from './styles'

interface ReviewStepProps {
  offer: OfferRecord
  partnerName: string
  categoryName: string | null
  config: CategoryConfig
  form: OfferForm
  errors: FieldErrors
  mode: WizardMode
  imageSaving: boolean
  reviewing: boolean
  saveImages: (next: { offerImageUrl: string | null; galleryUrls: string[] }) => Promise<boolean>
  onJump: (step: number, focusId?: string) => void
  onApprove: () => void
  onRequestChanges: () => void
  onDeactivate: () => void
}

export function ReviewStep({
  offer,
  partnerName,
  categoryName,
  config,
  form,
  errors,
  mode,
  imageSaving,
  reviewing,
  saveImages,
  onJump,
  onApprove,
  onRequestChanges,
  onDeactivate,
}: ReviewStepProps) {
  const checklist = submitChecklist(offer)
  const missing = checklist.filter((c) => !c.done)
  const canSubmit = offer.status === 'draft' || offer.status === 'needs_changes'
  const showAdmin = mode === 'admin' && (offer.status === 'pending' || offer.status === 'active')

  // Update the row first; only then delete the file, so a failed save never leaves a broken image.
  const removeCover = async () => {
    const url = form.offerImageUrl
    if (!url) return
    if (await saveImages({ offerImageUrl: null, galleryUrls: form.galleryUrls })) void removeOfferImage(url)
  }
  const removeGallery = async (url: string) => {
    const next = form.galleryUrls.filter((u) => u !== url)
    if (await saveImages({ offerImageUrl: form.offerImageUrl, galleryUrls: next })) void removeOfferImage(url)
  }

  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>Photos & review</h1>
        <p className={text.body}>Add photos, check everything over, then send it to our team.</p>
      </div>

      {showAdmin && (
        <SectionCard copyKey="adminReview" title="Admin review" tag={<OfferStatusBadge status={offer.status} />}>
          {offer.status === 'pending' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onApprove}
                disabled={reviewing}
                className="flex-1 min-h-12 px-5 rounded-xl bg-[#59FFA0] text-[#121113] font-header font-bold text-lg hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={onRequestChanges}
                disabled={reviewing}
                className="flex-1 min-h-12 px-5 rounded-xl border border-red-400/60 text-red-300 font-sans text-base font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Request changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={reviewing}
              className="w-full min-h-12 px-5 rounded-xl border border-red-400/60 text-red-300 font-sans text-base font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Deactivate
            </button>
          )}
        </SectionCard>
      )}

      {/* ── Photos ─────────────────────────────────────────────────────── */}
      <SectionCard id="offer-photos" copyKey="photos" title="Photos">
        <div className={space.field}>
          <p className={text.questionLabel}>Cover photo</p>
          {form.offerImageUrl ? (
            <div className="space-y-2">
              <img
                src={form.offerImageUrl}
                alt="Offer cover"
                className="w-full aspect-video object-cover rounded-xl border border-white/10 bg-white/5"
              />
              <button
                type="button"
                onClick={removeCover}
                disabled={imageSaving}
                className="min-h-12 text-base font-sans font-medium text-red-300 hover:underline disabled:opacity-50"
              >
                Remove cover
              </button>
            </div>
          ) : (
            <OfferImageUpload
              partnerId={offer.partner_id ?? ''}
              offerId={offer.id}
              variant="cover"
              label="Upload a cover photo"
              disabled={imageSaving}
              onUploaded={(url) => saveImages({ offerImageUrl: url, galleryUrls: form.galleryUrls })}
            />
          )}
          {errors.offer_image_url && (
            <p role="alert" className={text.error}>
              {errors.offer_image_url}
            </p>
          )}
        </div>

        <div className={space.field}>
          <p className={text.questionLabel}>
            More photos{' '}
            <span className="font-normal text-white/60 text-sm tabular-nums">
              {form.galleryUrls.length}/{LIMITS.gallery}
            </span>
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {form.galleryUrls.map((url, i) => (
              <li key={url} className="relative">
                <img
                  src={url}
                  alt={`Offer photo ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl border border-white/10 bg-white/5"
                />
                <button
                  type="button"
                  onClick={() => removeGallery(url)}
                  disabled={imageSaving}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1 right-1 w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </li>
            ))}
            {form.galleryUrls.length < LIMITS.gallery && (
              <li>
                <OfferImageUpload
                  partnerId={offer.partner_id ?? ''}
                  offerId={offer.id}
                  variant="tile"
                  label="Add photo"
                  disabled={imageSaving}
                  onUploaded={(url) =>
                    saveImages({ offerImageUrl: form.offerImageUrl, galleryUrls: [...form.galleryUrls, url] })
                  }
                />
              </li>
            )}
          </ul>
          {errors.gallery_urls && (
            <p role="alert" className={text.error}>
              {errors.gallery_urls}
            </p>
          )}
          {imageSaving && <p className={text.helper}>Saving photos…</p>}
        </div>
      </SectionCard>

      {/* ── Preview ────────────────────────────────────────────────────── */}
      <SectionCard copyKey="preview" title="Birthday Partner Preview">
        <OfferPreview
          offer={offer}
          partnerName={partnerName}
          categoryName={categoryName}
          config={config}
          onJump={onJump}
        />
      </SectionCard>

      {/* ── Checklist ──────────────────────────────────────────────────── */}
      <SectionCard copyKey="checklist" title="Needed to submit">
        <p className={cn(text.fieldLabel, missing.length ? 'text-white' : 'text-[#59FFA0]')}>
          {!canSubmit
            ? offer.status === 'pending'
              ? 'Submitted. Our team is reviewing this offer.'
              : 'This offer is live.'
            : missing.length
              ? `${missing.length} item${missing.length === 1 ? '' : 's'} left before you can submit.`
              : 'All set. You can submit for review.'}
        </p>
        <ul className="space-y-2">
          {checklist.map((item) =>
            item.done ? (
              <li key={item.key} className="flex items-center gap-3 min-h-12 px-1">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#59FFA0]" aria-hidden="true" />
                <span className="flex-1 min-w-0 font-sans text-base text-white/85 break-words">{item.label}</span>
                <span className={text.helper}>Done</span>
              </li>
            ) : (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onJump(item.step, item.focusId)}
                  className="w-full flex items-center gap-3 min-h-12 px-3 py-2 rounded-xl border border-red-500/40 bg-red-500/5 text-left hover:bg-red-500/10 transition-colors"
                >
                  <CircleAlert className="w-5 h-5 shrink-0 text-red-400" aria-hidden="true" />
                  <span className="flex-1 min-w-0 font-sans text-base text-white break-words">{item.label}</span>
                  <span className="font-sans text-sm font-semibold text-red-300 shrink-0">Fix →</span>
                </button>
              </li>
            )
          )}
        </ul>
      </SectionCard>
    </div>
  )
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function PreviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="space-y-2 pt-4 first:pt-0 border-t border-white/10 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <p className={text.questionLabel}>{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-12 px-3 -mr-3 shrink-0 font-sans text-base font-medium text-[#1AC8ED] hover:underline"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <p className={text.helper}>{children}</p>
}

function OfferPreview({
  offer,
  partnerName,
  categoryName,
  config,
  onJump,
}: {
  offer: OfferRecord
  partnerName: string
  categoryName: string | null
  config: CategoryConfig
  onJump: (step: number, focusId?: string) => void
}) {
  const includes = Array.isArray(offer.includes) ? offer.includes.filter((i): i is string => typeof i === 'string') : []
  const notice = detailText(offer, 'notice_label')
  const facts = [
    groupSizeWording(offer.min_guests, offer.max_guests),
    detailText(offer, 'duration_label'),
    // "I’ll confirm availability" reads on its own; the others get "notice".
    notice && (notice.startsWith('I') ? notice : `${notice} notice`),
  ].filter(Boolean) as string[]
  const requirements = requirementSummary(offer, config)
  const perkRows = perkSummary(offer)
  const addOns = addOnList(offer)
  const availability = availabilitySummary(offer)

  return (
    <div className={cn(cardClass, 'bg-[#121113] overflow-hidden')}>
      {offer.offer_image_url && (
        <img src={offer.offer_image_url} alt="" className="w-full aspect-video object-cover" />
      )}
      <div className="p-4 space-y-4">
        <PreviewBlock title="Offer" onEdit={() => onJump(STEP.offer, 'offer-title')}>
          <p className="font-sans text-sm text-[#7DD8E8] break-words">
            {partnerName}
            {categoryName ? ` · ${categoryName}` : ''}
          </p>
          <p className="font-header text-[22px] font-bold leading-snug text-white break-words">
            {offer.title || 'Untitled offer'}
          </p>
          <p className={cn('text-2xl font-bold text-[#59FFA0]', priceFontClass)}>{priceWording(offer)}</p>
          {offer.description && <p className={cn(text.body, 'break-words')}>{offer.description}</p>}
          {facts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {facts.map((f) => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 font-sans">
                  {f}
                </span>
              ))}
            </div>
          )}
          {includes.length > 0 ? (
            <ul className="space-y-1.5">
              {includes.map((item) => (
                <li key={item} className="flex gap-2 font-sans text-base text-white/85 break-words min-w-0">
                  <span className="text-[#59FFA0]" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <Muted>Nothing included yet.</Muted>
          )}
        </PreviewBlock>

        {/* Birthday perk answers; each row edits its own question on the perks step. */}
        {perkRows.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-white/10">
            <p className={text.questionLabel}>Birthday perk</p>
            <dl className="space-y-1">
              {perkRows.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 font-sans text-base break-words py-2">
                    <dt className="inline text-white/60">{row.label}: </dt>
                    <dd className={cn('inline', row.value ? 'text-white/85' : 'text-red-300')}>{row.value ?? 'Not set'}</dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJump(STEP.perks, row.focusId)}
                    aria-label={`Edit ${row.label.toLowerCase()}`}
                    className="min-h-12 px-3 -mr-3 shrink-0 font-sans text-base font-medium text-[#1AC8ED] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </dl>
          </div>
        )}

        {requirements.length > 0 && (
          <PreviewBlock title="Good to know" onEdit={() => onJump(STEP.offer, 'offer-requirements')}>
            <dl className="space-y-1.5">
              {requirements.map((r) => (
                <div key={r.label} className="font-sans text-base break-words">
                  <dt className="inline text-white/60">{r.label}: </dt>
                  <dd className="inline text-white/85">{r.value}</dd>
                </div>
              ))}
            </dl>
          </PreviewBlock>
        )}

        <PreviewBlock title="Add-ons" onEdit={() => onJump(STEP.addOns)}>
          {addOns.length ? (
            <ul className="space-y-1.5">
              {addOns.map((a) => (
                <li key={a.name} className="flex justify-between gap-3 font-sans text-base text-white/85">
                  <span className="min-w-0 break-words">{a.name}</span>
                  <span className={cn('shrink-0 text-[#59FFA0] font-bold', priceFontClass)}>+{formatPrice(a.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Muted>No add-ons.</Muted>
          )}
        </PreviewBlock>

        <PreviewBlock title="Availability" onEdit={() => onJump(STEP.availability, 'offer-availability')}>
          <ul className="space-y-1.5 font-sans text-base text-white/85">
            {availability.confirmEach && <li>Confirms each booking</li>}
            {availability.days && <li>{availability.days}</li>}
            {availability.hours && <li>{availability.hours}</li>}
            {availability.blackoutCount > 0 && (
              <li>
                {availability.blackoutCount} blackout date{availability.blackoutCount === 1 ? '' : 's'}
              </li>
            )}
            {availability.radius && <li>Travels: {availability.radius}</li>}
          </ul>
          {!availability.confirmEach && !availability.days && <Muted>No days set yet.</Muted>}
        </PreviewBlock>

        <PreviewBlock title="Why you" onEdit={() => onJump(STEP.pitch, 'offer-pitch')}>
          {offer.pitch ? (
            <p className="font-sans text-base italic text-white/85 break-words">“{offer.pitch}”</p>
          ) : (
            <Muted>Not written yet.</Muted>
          )}
        </PreviewBlock>

        <PreviewBlock title="Photos" onEdit={() => onJump(STEP.review, 'offer-photos')}>
          {offer.gallery_urls?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {offer.gallery_urls.map((url) => (
                <img key={url} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          ) : (
            !offer.offer_image_url && <Muted>No photos yet.</Muted>
          )}
          {offer.offer_image_url && !offer.gallery_urls?.length && <Muted>Cover photo only.</Muted>}
        </PreviewBlock>
      </div>
    </div>
  )
}
