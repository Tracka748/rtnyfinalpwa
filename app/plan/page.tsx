'use client'

import { usePlanBuilder } from '@/hooks/usePlanBuilder'
import { PlanHero } from '@/components/custom/plan/PlanHero'
import { StepIndicator } from '@/components/custom/plan/StepIndicator'
import { EventDetailsForm } from '@/components/custom/plan/EventDetailsForm'
import { VendorBrowser } from '@/components/custom/plan/VendorBrowser'
import { PlanSummaryPanel } from '@/components/custom/plan/PlanSummaryPanel'
import { RequestForm } from '@/components/custom/plan/RequestForm'

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ id }: { id: string | null }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      {/* Animated check */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-[#59ffa0]/10 border-2 border-[#59ffa0]/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-[#59ffa0]" viewBox="0 0 40 40" fill="none">
            <path d="M10 20l7 7 13-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full bg-[#59ffa0]/5 animate-ping" />
      </div>

      <h2 className="font-header text-3xl font-bold text-[#f9fdff] mb-2">
        Request Submitted!
      </h2>
      <p className="text-[#7DD8E8] font-sans text-base max-w-md leading-relaxed mb-6">
        Your event plan has been received. Our team will review your selections and reach out shortly.
      </p>

      {id && (
        <div className="mb-6 px-4 py-2 rounded-xl border border-[#2a2829] bg-[#1a1819] inline-flex items-center gap-2">
          <span className="text-[#7DD8E8] text-xs font-label">Request ID</span>
          <span className="text-[#59ffa0] font-slab-serif text-sm font-bold">{id.slice(0, 8).toUpperCase()}</span>
        </div>
      )}

      <a
        href="/"
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 transition-colors"
      >
        Back to RTNY
      </a>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const builder = usePlanBuilder()

  if (builder.submitted) {
    return (
      <div className="min-h-screen bg-[#121113]">
        <SuccessScreen id={builder.submittedId} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113]">
      <PlanHero />

      {/* Step indicator */}
      <div className="sticky top-16 z-40 bg-[#121113]/95 backdrop-blur-sm border-b border-[#2a2829] px-4 py-4">
        <StepIndicator currentStep={builder.currentStep} />
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Step 1 — Event Details (full width) */}
        {builder.currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="font-header text-2xl font-bold text-[#f9fdff]">Event Details</h2>
              <p className="text-[#7DD8E8] text-sm font-sans mt-1">
                Tell us about your event so we can find the right vendors.
              </p>
            </div>
            <EventDetailsForm
              eventDetails={builder.eventDetails}
              onUpdate={builder.setEventDetail}
              canProceed={builder.canProceedFromStep1}
              onNext={builder.goNext}
            />
          </div>
        )}

        {/* Step 2 — Browse Vendors (2-col on desktop: vendor grid + summary panel) */}
        {builder.currentStep === 2 && (
          <>
            <div className="flex gap-6 items-start">
              {/* Left: vendor browser */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <h2 className="font-header text-2xl font-bold text-[#f9fdff]">Browse Vendors</h2>
                  <p className="text-[#7DD8E8] text-sm font-sans mt-1">
                    Select services to add them to your plan. Prices reflect{' '}
                    {builder.eventDetails.eventDate
                      ? new Date(builder.eventDetails.eventDate).toLocaleDateString('en-US', { weekday: 'long' })
                      : 'your selected date'}{' '}
                    pricing.
                  </p>
                </div>
                <VendorBrowser
                  vendors={builder.vendors}
                  loading={builder.vendorsLoading}
                  error={builder.vendorsError}
                  categoryFilter={builder.categoryFilter}
                  selectedServiceIds={builder.selectedServiceIds}
                  eventDate={builder.eventDetails.eventDate}
                  onCategoryChange={builder.setCategoryFilter}
                  onToggleService={builder.toggleService}
                  onBack={builder.goBack}
                  onNext={builder.goNext}
                  selectedCount={builder.selectedServices.length}
                />
              </div>

              {/* Right: sticky summary panel (desktop only) */}
              <div className="hidden lg:block w-72 shrink-0">
                <PlanSummaryPanel
                  selectedServices={builder.selectedServices}
                  estimatedTotal={builder.estimatedTotal}
                  onRemoveService={builder.toggleService}
                />
              </div>
            </div>

            {/* Mobile floating summary bar */}
            <PlanSummaryPanel
              selectedServices={builder.selectedServices}
              estimatedTotal={builder.estimatedTotal}
              onRemoveService={builder.toggleService}
              compact
            />
          </>
        )}

        {/* Step 3 — Review & Submit */}
        {builder.currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="font-header text-2xl font-bold text-[#f9fdff]">Review & Submit</h2>
              <p className="text-[#7DD8E8] text-sm font-sans mt-1">
                Confirm your selections and submit your planning request.
              </p>
            </div>
            <RequestForm
              selectedServices={builder.selectedServices}
              estimatedTotal={builder.estimatedTotal}
              notes={builder.notes}
              contactEmail={builder.contactEmail}
              submitting={builder.submitting}
              submitError={builder.submitError}
              onNotesChange={builder.setNotes}
              onEmailChange={builder.setContactEmail}
              onSubmit={builder.submitRequest}
              onBack={builder.goBack}
              onRemoveService={builder.toggleService}
            />
          </div>
        )}
      </div>

      {/* Extra bottom padding on mobile when summary bar is visible */}
      {builder.currentStep === 2 && builder.selectedServices.length > 0 && (
        <div className="h-20 lg:hidden" />
      )}
    </div>
  )
}
