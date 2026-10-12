'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { STEP, fieldDomId, useOfferWizard } from '@/hooks/useOfferWizard'
import type { WizardMode } from './types'
import { StepProgress } from './StepProgress'
import { StickyActionBar } from './StickyActionBar'
import { FormBanner } from './FormBanner'
import { WelcomeStep } from './WelcomeStep'
import { CategoryStep } from './CategoryStep'
import { OfferDetailsStep } from './OfferDetailsStep'
import { PerksStep } from './PerksStep'
import { PERKS_STEP_COPY } from './sectionCopy'
import { AddOnsStep } from './AddOnsStep'
import { AvailabilityStep } from './AvailabilityStep'
import { PitchStep } from './PitchStep'
import { ReviewStep } from './ReviewStep'
import { SubmittedScreen } from './SubmittedScreen'
import { ActionSheet, RequestChangesSheet } from './ActionSheet'
import { submitChecklist } from './offerReview'
import { cn } from '@/lib/utils'
import { DEFAULT_THEME, type CampaignTheme } from './themes'
import { CampaignThemeProvider } from './themes/ThemeContext'
import { ThemedHeader } from './themed/ThemedHeader'
import { ThemedWelcome } from './themed/ThemedWelcome'
import { ThemedSuccess } from './themed/ThemedSuccess'
import { OfferStatusBadge } from './OfferStatusBadge'
import { cardClass, space, text } from './styles'

export interface OfferWizardProps {
  partnerId: string
  offerId?: string | null
  mode: WizardMode
  exitHref: string
  // Campaign skin for the welcome step, step headers, review preview and success screen.
  theme?: CampaignTheme
}

function focusElement(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const target = el.matches('input, textarea, select, button')
    ? el
    : el.querySelector<HTMLElement>('input, textarea, select, button:not([disabled])') ?? el
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.focus({ preventScroll: true })
}

export function OfferWizard({ partnerId, offerId, mode, exitHref, theme = DEFAULT_THEME }: OfferWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const wizard = useOfferWizard({ partnerId, offerId: offerId ?? null })
  const { step, steps, partner, offer, focusToken, invalidFields, banner } = wizard

  const [requestChangesOpen, setRequestChangesOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  // Element to focus after jumping to another step (checklist "Fix →", preview "Edit").
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)

  const profileHref = mode === 'admin' ? `/admin/partners/${partnerId}/edit` : '/profile/partner/edit'
  // The admin sidebar is sticky at md+; keep the bar out from under it.
  const barOffset = mode === 'admin' ? 'md:left-64' : undefined

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, wizard.submitted])

  // Declared after the scroll-to-top effect so a jump target wins.
  useEffect(() => {
    if (!pendingFocusId) return
    focusElement(pendingFocusId)
    setPendingFocusId(null)
  }, [step, pendingFocusId])

  // Non-field errors (auth, conflict, network) and success notes show in the top banner.
  useEffect(() => {
    if (banner) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [banner])

  // After a failed save or submit, scroll to and focus the first invalid field.
  const handledFocusToken = useRef(0)
  useEffect(() => {
    if (focusToken === handledFocusToken.current) return
    handledFocusToken.current = focusToken
    const first = invalidFields[0]
    if (first) focusElement(fieldDomId(first.key))
  }, [focusToken, invalidFields])

  // Unsaved-changes check for "Save changes" on a live offer: snapshot the form each
  // time a saved offer arrives (load, save, photo update) and compare against it.
  const formJson = JSON.stringify(wizard.form)
  const [formBaseline, setFormBaseline] = useState({ offer, json: formJson })
  if (formBaseline.offer !== offer) setFormBaseline({ offer, json: formJson })
  const formDirty = formBaseline.offer === offer && formBaseline.json !== formJson

  async function saveLiveChanges() {
    const saved = await wizard.save()
    if (!saved) return
    wizard.setBanner({
      type: 'success',
      // An owner's edit to a live offer goes back to review (see the notice above).
      message: saved.status === 'pending' ? 'Saved. Your changes are back with our team for review.' : 'Changes saved.',
    })
  }

  function jumpTo(target: number, focusId?: string) {
    wizard.goToStep(target)
    if (focusId) setPendingFocusId(focusId)
  }

  // Saves the current step, then continues or exits. The first save (perks step, or
  // the offer step for older drafts) creates the offer, so its id goes into the URL
  // (?offer=) for refresh/resume. The perks step also fills the offer from its answers.
  async function persist(intent: 'continue' | 'exit') {
    const wasNew = !offer
    const saved = step === STEP.perks ? await wizard.savePerks() : await wizard.save()
    if (!saved) return
    if (wasNew) router.replace(`${pathname}?offer=${saved.id}`, { scroll: false })
    if (intent === 'exit') router.push(exitHref)
    else wizard.goNext()
  }

  // ── Loading / load error ──────────────────────────────────────────────────

  if (wizard.loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6" aria-busy="true">
        <div className="h-10 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-8 w-3/4 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-48 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        <div className="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (wizard.loadError || !partner) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 space-y-3" role="alert">
          <p className="text-base text-red-400 font-sans">{wizard.loadError ?? 'We couldn’t load this partner.'}</p>
          <a href={exitHref} className="inline-flex min-h-12 items-center text-base text-[#1AC8ED] hover:underline">
            ← Back to birthday offers
          </a>
        </div>
      </div>
    )
  }

  // ── Submitted ─────────────────────────────────────────────────────────────

  if (wizard.submitted && offer) {
    return (
      <div className={cn('max-w-2xl mx-auto', space.barClearance)}>
        <ThemedSuccess theme={theme} badge={<OfferStatusBadge status={offer.status} />}>
          <SubmittedScreen
            offer={offer}
            categoryName={partner.categoryName}
            exitHref={exitHref}
            statusColor={theme.accent}
            headingAs="h2"
            hideBadge
          />
        </ThemedSuccess>
        <StickyActionBar className={barOffset} primaryLabel="Back to offers" onPrimary={() => router.push(exitHref)} />
      </div>
    )
  }

  // ── Steps ─────────────────────────────────────────────────────────────────

  const reviewNotice =
    mode === 'owner' && offer && (offer.status === 'active' || offer.status === 'pending')
      ? 'This offer is live or in review. Saving changes sends it back to our team for a quick review.'
      : null
  const changesNote = offer?.status === 'needs_changes' && offer.review_note ? offer.review_note : null

  const checklistDone = offer ? submitChecklist(offer).every((c) => c.done) : false
  const isLive = offer?.status === 'active'
  const isPending = offer?.status === 'pending'
  const canSubmit = !!offer && (offer.status === 'draft' || offer.status === 'needs_changes')
  const busy = wizard.saving || wizard.imageSaving || wizard.reviewing
  const hasAddOns = Object.keys(wizard.form.addOnPresets).length + wizard.form.customAddOns.length > 0

  const saveBar = (primaryLabel = 'Continue', layout: 'inline' | 'stacked' = 'inline') => (
    <StickyActionBar
      className={barOffset}
      layout={layout}
      onBack={wizard.goBack}
      primaryLabel={primaryLabel}
      onPrimary={() => persist('continue')}
      loading={wizard.saving}
      secondaryLabel="Save & finish later"
      onSecondary={() => persist('exit')}
    />
  )

  return (
    <CampaignThemeProvider value={theme}>
      <div className={cn('max-w-2xl mx-auto', space.sections, space.barClearance)}>
        <div className="space-y-3">
          {mode === 'admin' && (
            <div className={`${cardClass} px-4 py-3 text-base font-sans text-white/75 break-words`}>
              Editing for <span className="text-white font-medium">{partner.displayName}</span>
            </div>
          )}
          {/* The welcome step carries the full themed header, so the light one starts at step 2. */}
          <div>
            <StepProgress steps={steps} current={step} />
            {step > STEP.welcome && (
              <ThemedHeader
                theme={theme}
                variant="light"
                // The perks page body already shows the eyebrow.
                showEyebrow={step !== STEP.perks}
                // Steps 4-8 show the eyebrow text only, with no sprinkle strip.
                decorate={step < STEP.offer}
                seed={step}
                className="mt-1"
              />
            )}
          </div>
        </div>

        {/* The reviewer's note stays visible on every step until the offer is resubmitted. */}
        {changesNote && step >= STEP.perks && (
          <div role="note" className="p-4 rounded-2xl border-2 border-red-500/50 bg-red-500/10 space-y-1">
            <p className={cn(text.eyebrow, 'text-red-300')}>Changes requested</p>
            <p className="font-sans text-base text-white break-words whitespace-pre-line">{changesNote}</p>
          </div>
        )}

        {reviewNotice && step >= STEP.perks && (
          <div className="p-4 rounded-xl border bg-[#FFB547]/10 border-[#FFB547]/30 text-base font-sans text-[#FFB547]">
            {reviewNotice}
          </div>
        )}

        <FormBanner banner={banner} />

        {/* Lists the fields that still fail; shrinks as they're fixed and disappears when none remain. */}
        {invalidFields.length > 0 && (
          <FormBanner
            banner={{
              type: 'error',
              message: `A few fields need another look: ${invalidFields.map((f) => f.label).join(', ')}.`,
            }}
          />
        )}

        {step === STEP.welcome && (
          <ThemedWelcome theme={theme}>
            <WelcomeStep
              partnerName={partner.displayName}
              highlight={{ word: theme.welcome.highlight, color: theme.accent }}
              hideIcon
            />
          </ThemedWelcome>
        )}

        {step === STEP.category && (
          <CategoryStep categoryName={partner.categoryName} config={wizard.config} profileHref={profileHref} />
        )}

        {step === STEP.perks && (
          <PerksStep form={wizard.form} errors={wizard.fieldErrors} updateField={wizard.updateField} />
        )}

        {step === STEP.offer && (
          <OfferDetailsStep
            form={wizard.form}
            errors={wizard.fieldErrors}
            config={wizard.config}
            categoryName={partner.categoryName}
            legacyNotes={wizard.legacyNotes}
            updateField={wizard.updateField}
            setRequirement={wizard.setRequirement}
            onEditPerks={() => jumpTo(STEP.perks, 'offer-detail-offer_type')}
            onSwitchPricingMode={wizard.switchPricingMode}
          />
        )}

        {step === STEP.addOns && (
          <AddOnsStep form={wizard.form} errors={wizard.fieldErrors} config={wizard.config} updateField={wizard.updateField} />
        )}

        {step === STEP.availability && (
          <AvailabilityStep
            form={wizard.form}
            errors={wizard.fieldErrors}
            travels={wizard.travels}
            updateField={wizard.updateField}
          />
        )}

        {step === STEP.pitch && (
          <PitchStep form={wizard.form} errors={wizard.fieldErrors} config={wizard.config} updateField={wizard.updateField} />
        )}

        {step === STEP.review && offer && (
          <ReviewStep
            offer={offer}
            partnerName={partner.displayName}
            categoryName={partner.categoryName}
            config={wizard.config}
            form={wizard.form}
            errors={wizard.fieldErrors}
            mode={mode}
            imageSaving={wizard.imageSaving}
            reviewing={wizard.reviewing}
            saveImages={wizard.saveImages}
            onJump={jumpTo}
            onApprove={() => wizard.review('approve')}
            onRequestChanges={() => setRequestChangesOpen(true)}
            onDeactivate={() => setDeactivateOpen(true)}
            theme={theme}
          />
        )}

        {/* ── Action bars ─────────────────────────────────────────────────── */}

        {step === STEP.welcome && (
          <StickyActionBar
            className={barOffset}
            backLabel="Cancel"
            onBack={() => router.push(exitHref)}
            primaryLabel="Let’s Build Your Birthday Offer"
            onPrimary={wizard.goNext}
          />
        )}

        {step === STEP.category && (
          <StickyActionBar
            className={barOffset}
            onBack={wizard.goBack}
            primaryLabel="Continue"
            onPrimary={wizard.goNext}
            disabled={!partner.categoryName}
          />
        )}

        {step === STEP.perks && saveBar(PERKS_STEP_COPY.continueLabel, 'stacked')}
        {step === STEP.offer && saveBar()}
        {step === STEP.addOns && saveBar(hasAddOns ? 'Continue' : 'Skip for now')}
        {step === STEP.availability && saveBar()}
        {step === STEP.pitch && saveBar()}

        {step === STEP.review && (
          <StickyActionBar
            className={barOffset}
            onBack={wizard.goBack}
            // Draft / needs changes: submit. Live: save edits (enabled once something changed).
            // Pending: already submitted.
            primaryLabel={isLive ? 'Save changes' : isPending ? 'Submitted' : 'Submit for review'}
            loadingLabel={isLive ? 'Saving…' : 'Submitting…'}
            onPrimary={isLive ? saveLiveChanges : () => wizard.submit()}
            disabled={
              isLive
                ? !formDirty || wizard.imageSaving || wizard.reviewing
                : !canSubmit || !checklistDone || wizard.imageSaving || wizard.reviewing
            }
            loading={wizard.saving}
            secondaryLabel="Save draft"
            onSecondary={() => persist('exit')}
          />
        )}

        {/* ── Admin sheets ───────────────────────────────────────────────── */}

        <RequestChangesSheet
          open={requestChangesOpen}
          onOpenChange={setRequestChangesOpen}
          offerTitle={offer?.title}
          busy={wizard.reviewing}
          onSubmit={async (note) => {
            // Success or failure is reported in the page banner, so the sheet closes either way.
            await wizard.review('request_changes', note)
            setRequestChangesOpen(false)
          }}
        />

        <ActionSheet
          open={deactivateOpen}
          onOpenChange={setDeactivateOpen}
          title="Deactivate this offer?"
          description="It comes off the public site right away and goes back to draft. The partner can edit and resubmit it."
          confirmLabel="Deactivate"
          tone="danger"
          busy={wizard.reviewing}
          onConfirm={async () => {
            await wizard.review('deactivate')
            setDeactivateOpen(false)
          }}
        />

        {busy && <span className="sr-only" aria-live="polite">Saving…</span>}
      </div>
    </CampaignThemeProvider>
  )
}
