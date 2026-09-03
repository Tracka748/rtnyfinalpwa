'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { usePlanBuilder } from '@/hooks/usePlanBuilder'
import { PlanHero } from '@/components/custom/plan/PlanHero'
import { StepIndicator } from '@/components/custom/plan/StepIndicator'
import { EventDetailsForm } from '@/components/custom/plan/EventDetailsForm'
import { VendorBrowser } from '@/components/custom/plan/VendorBrowser'
import { PlanSummaryPanel } from '@/components/custom/plan/PlanSummaryPanel'
import { RequestForm } from '@/components/custom/plan/RequestForm'
import { PlanMyDay } from '@/components/custom/plan/PlanMyDay'

type PlanMode = 'event' | 'day'

// ─── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: PlanMode; onChange: (m: PlanMode) => void }) {
  return (
    <div className="flex items-center justify-center px-4 pt-6 pb-2">
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-[#2a2829] bg-[#1a1819]">
        <button
          type="button"
          onClick={() => onChange('event')}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-sans font-semibold transition-all duration-200',
            mode === 'event'
              ? 'bg-[#59ffa0] text-[#121113] shadow-sm'
              : 'text-[#7DD8E8] hover:text-[#f9fdff]'
          )}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4 1v4M10 1v4M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Plan My Event
        </button>

        <button
          type="button"
          onClick={() => onChange('day')}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-sans font-semibold transition-all duration-200',
            mode === 'day'
              ? 'bg-[#1ac8ed] text-[#121113] shadow-sm'
              : 'text-[#7DD8E8] hover:text-[#f9fdff]'
          )}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Plan My Day
        </button>
      </div>
    </div>
  )
}

// ─── Event builder success screen ─────────────────────────────────────────────

function SuccessScreen({ id, onBack }: { id: string | null; onBack: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#f9fdff] transition-all"
        >
          Plan Another Event
        </button>
        <a
          href="/"
          className="px-6 py-2.5 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 transition-colors"
        >
          Back to RTNY
        </a>
      </div>
    </div>
  )
}

// ─── Event builder view (extracted for clarity) ───────────────────────────────

function EventBuilderView() {
  const builder = usePlanBuilder()

  if (builder.submitted) {
    return <SuccessScreen id={builder.submittedId} onBack={() => window.location.reload()} />
  }

  return (
    <>
      {/* Step indicator */}
      <div className="sticky top-16 z-40 bg-[#121113]/95 backdrop-blur-sm border-b border-[#2a2829] px-4 py-4">
        <StepIndicator currentStep={builder.currentStep} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Step 1 */}
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

        {/* Step 2 */}
        {builder.currentStep === 2 && (
          <>
            <div className="flex gap-6 items-start">
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
                  themeFilter={builder.themeFilter}
                  themeOptions={builder.themeOptions}
                  selectedServiceIds={builder.selectedServiceIds}
                  eventDate={builder.eventDetails.eventDate}
                  planItems={builder.planItems}
                  onCategoryChange={builder.setCategoryFilter}
                  onThemeChange={builder.setThemeFilter}
                  onToggleService={builder.toggleService}
                  onAddToPlan={builder.addToPlan}
                  onBack={builder.goBack}
                  onNext={builder.goNext}
                  selectedCount={builder.selectedServices.length}
                />
              </div>

              <div className="hidden lg:block w-[280px] shrink-0 sticky top-[220px] self-start ml-8 border-l border-white/10 pl-6">
                <PlanSummaryPanel
                  selectedServices={builder.selectedServices}
                  estimatedTotal={builder.estimatedTotal}
                  onRemoveService={builder.toggleService}
                  planItems={builder.planItems}
                  onRemoveFromPlan={builder.removeFromPlan}
                />
              </div>
            </div>

            <PlanSummaryPanel
              selectedServices={builder.selectedServices}
              estimatedTotal={builder.estimatedTotal}
              onRemoveService={builder.toggleService}
              planItems={builder.planItems}
              onRemoveFromPlan={builder.removeFromPlan}
              compact
            />
          </>
        )}

        {/* Step 3 */}
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
              planItems={builder.planItems}
            />
          </div>
        )}
      </div>

      {builder.currentStep === 2 && (builder.selectedServices.length > 0 || builder.planItems.length > 0) && (
        <div className="h-20 lg:hidden" />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [mode, setMode] = useState<PlanMode>('event')

  return (
    <div className="min-h-screen bg-[#121113]">
      <PlanHero />

      <ModeToggle mode={mode} onChange={setMode} />

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-4 mt-2 mb-0">
        <div className="h-px bg-gradient-to-r from-transparent via-[#2a2829] to-transparent" />
      </div>

      {/* Mode views — both are always mounted to preserve independent state */}
      <div className={mode === 'event' ? 'block' : 'hidden'}>
        <EventBuilderView />
      </div>

      <div className={cn('px-4 py-8', mode === 'day' ? 'block' : 'hidden')}>
        <PlanMyDay />
      </div>
    </div>
  )
}
