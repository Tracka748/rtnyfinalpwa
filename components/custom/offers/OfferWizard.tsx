'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useOfferWizard } from '@/hooks/useOfferWizard'
import type { WizardMode } from './types'
import { StepProgress } from './StepProgress'
import { StickyActionBar } from './StickyActionBar'
import { FormBanner } from './FormBanner'
import { WelcomeStep } from './WelcomeStep'
import { CategoryStep } from './CategoryStep'
import { OfferDetailsStep } from './OfferDetailsStep'
import { DraftSavedScreen } from './DraftSavedScreen'
import { cardClass } from './styles'

export interface OfferWizardProps {
  partnerId: string
  offerId?: string | null
  mode: WizardMode
  exitHref: string
}

export function OfferWizard({ partnerId, offerId, mode, exitHref }: OfferWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const wizard = useOfferWizard({ partnerId, offerId: offerId ?? null })
  const { step, steps, partner, offer } = wizard

  const profileHref = mode === 'admin' ? `/admin/partners/${partnerId}/edit` : '/profile/partner/edit'
  // The admin sidebar is sticky at md+; keep the bar out from under it.
  const barOffset = mode === 'admin' ? 'md:left-64' : undefined

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, wizard.showSummary])

  async function persist(intent: 'continue' | 'exit') {
    const wasNew = !offer
    const saved = await wizard.save()
    if (!saved) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (wasNew) router.replace(`${pathname}?offer=${saved.id}`, { scroll: false })
    if (intent === 'exit') router.push(exitHref)
    else wizard.setShowSummary(true)
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
          <p className="text-red-400 font-sans">{wizard.loadError ?? 'We couldn’t load this partner.'}</p>
          <a href={exitHref} className="inline-flex min-h-12 items-center text-sm text-[#1AC8ED] hover:underline">
            ← Back to birthday offers
          </a>
        </div>
      </div>
    )
  }

  // ── Draft saved (temporary end until steps 4-7 exist) ─────────────────────

  if (wizard.showSummary && offer) {
    return (
      <div className="max-w-2xl mx-auto pb-40">
        <DraftSavedScreen offer={offer} categoryName={partner.categoryName} exitHref={exitHref} />
        <StickyActionBar
          className={barOffset}
          backLabel="Keep editing"
          onBack={() => wizard.setShowSummary(false)}
          primaryLabel="Back to offers"
          onPrimary={() => router.push(exitHref)}
        />
      </div>
    )
  }

  // ── Steps ─────────────────────────────────────────────────────────────────

  const reviewNotice =
    mode === 'owner' && offer && (offer.status === 'active' || offer.status === 'pending')
      ? 'This offer is live or in review. Saving changes sends it back to our team for a quick review.'
      : null

  return (
    <div className="max-w-2xl mx-auto pb-44 space-y-6">
      <div className="space-y-3">
        {mode === 'admin' && (
          <div className={`${cardClass} px-4 py-3 text-sm font-sans text-white/70`}>
            Editing for <span className="text-white font-medium">{partner.displayName}</span>
          </div>
        )}
        <StepProgress steps={steps} current={step} />
      </div>

      <FormBanner banner={wizard.banner} />

      {step === 1 && <WelcomeStep partnerName={partner.displayName} />}

      {step === 2 && (
        <CategoryStep categoryName={partner.categoryName} group={wizard.categoryGroup} profileHref={profileHref} />
      )}

      {step === 3 && (
        <OfferDetailsStep
          form={wizard.form}
          errors={wizard.fieldErrors}
          group={wizard.categoryGroup}
          categoryName={partner.categoryName}
          reviewNotice={reviewNotice}
          updateField={wizard.updateField}
          setDetail={wizard.setDetail}
        />
      )}

      {step === 1 && (
        <StickyActionBar
          className={barOffset}
          backLabel="Cancel"
          onBack={() => router.push(exitHref)}
          primaryLabel="Let’s Build Your Birthday Offer"
          onPrimary={wizard.goNext}
        />
      )}

      {step === 2 && (
        <StickyActionBar
          className={barOffset}
          onBack={wizard.goBack}
          primaryLabel="Continue"
          onPrimary={wizard.goNext}
          disabled={!partner.categoryName}
        />
      )}

      {step === 3 && (
        <StickyActionBar
          className={barOffset}
          onBack={wizard.goBack}
          primaryLabel="Continue"
          onPrimary={() => persist('continue')}
          loading={wizard.saving}
          secondaryLabel="Save & finish later"
          onSecondary={() => persist('exit')}
        />
      )}
    </div>
  )
}
