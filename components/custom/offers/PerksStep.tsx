'use client'

import type { ComponentType, ReactNode } from 'react'
import { Check, Gift, Percent, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS } from '@/hooks/useOfferWizard'
import { MONTHLY_PRESETS, type DiscountType, type MonthlyChoice, type OfferType } from './perks'
import { PERKS_STEP_COPY, PERK_OPTIONS } from './sectionCopy'
import { FieldErrorText, NeededTag } from './Field'
import { MoneyInput } from './MoneyInput'
import { groupErrorClass, inputClass, perks, text } from './styles'

interface PerksStepProps {
  form: OfferForm
  errors: FieldErrors
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => void
}

const OFFER_TYPE_ICONS: Record<OfferType, ComponentType<{ className?: string }>> = {
  free: Gift,
  discount: Percent,
  bogo: RefreshCw,
  perk: Sparkles,
}

const COPY = PERKS_STEP_COPY.sections

// One divider-separated section: plain title, "Needed to submit" on its own line, grey question.
function PerkSection({
  title,
  question,
  needed = true,
  first,
  children,
}: {
  title: string
  question: string
  needed?: boolean
  first?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn('space-y-4', first ? 'pt-6' : cn(perks.divider, 'pt-6 mt-6'))}>
      <div className="space-y-2">
        <h2 className={perks.sectionTitle}>{title}</h2>
        {needed && (
          <div>
            <NeededTag />
          </div>
        )}
        <p className={perks.question}>{question}</p>
      </div>
      {children}
    </section>
  )
}

export function PerksStep({ form, errors, updateField }: PerksStepProps) {
  const fixed = form.pricingMode === 'fixed'

  const pickOfferType = (value: OfferType) => {
    const next = form.offerType === value && fixed ? null : value
    updateField('offerType', next, 'details.offer_type', 'details.discount_type', 'details.discount_value')
    if (value !== 'discount') {
      updateField('discountType', null)
      updateField('discountValue', '')
    }
  }

  const pickDiscountType = (value: DiscountType) => {
    updateField('discountType', value, 'details.discount_type', 'details.discount_value')
    // Percent and dollar amounts aren't interchangeable, so start the amount fresh.
    if (value !== form.discountType) updateField('discountValue', '')
  }

  const pickMonthly = (choice: MonthlyChoice) => {
    // Switching choice clears the other keys: only the chosen one is written on save.
    updateField('monthlyChoice', choice, 'details.monthly_limit')
    if (choice !== 'custom') updateField('monthlyCustom', '')
  }

  const toggleApplies = (value: string) => {
    const has = form.appliesTo.includes(value)
    if (!has && form.appliesTo.length >= LIMITS.detailListItems) return
    updateField('appliesTo', has ? form.appliesTo.filter((v) => v !== value) : [...form.appliesTo, value], 'details.applies_to')
  }

  const toggleEligible = (value: string) =>
    updateField(
      'eligible',
      form.eligible.includes(value) ? form.eligible.filter((v) => v !== value) : [...form.eligible, value],
      'details.eligible'
    )

  const alternatives: { choice: MonthlyChoice; label: string }[] = [
    { choice: 'unlimited', label: PERK_OPTIONS.monthly.unlimited },
    { choice: 'custom', label: PERK_OPTIONS.monthly.custom },
    { choice: 'confirm_each', label: PERK_OPTIONS.monthly.confirmEach },
  ]

  return (
    <div className={perks.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-6">
        <p className={perks.eyebrow}>{PERKS_STEP_COPY.eyebrow}</p>
        <h1 className={perks.headline}>{PERKS_STEP_COPY.headline}</h1>
        <p className={perks.subline}>{PERKS_STEP_COPY.subline}</p>
        {fixed && (
          <p className="mt-2 p-4 rounded-xl border border-[#1AC8ED]/30 bg-[#1AC8ED]/10 font-sans text-base text-[#B8F5DC]">
            {PERKS_STEP_COPY.fixedPriceNote}
          </p>
        )}
      </div>

      <div className={perks.divider}>
        {/* ── 1. Offer type ─────────────────────────────────────────────── */}
        <PerkSection title={COPY.offerType.title} question={COPY.offerType.question} needed={!fixed} first>
          <div className="space-y-2">
            <div
              id="offer-detail-offer_type"
              role="radiogroup"
              aria-label="Offer type"
              className={cn('grid grid-cols-2 gap-3', errors['details.offer_type'] && groupErrorClass)}
            >
              {PERK_OPTIONS.offerTypes.map((opt) => {
                const value = opt.value as OfferType
                const selected = form.offerType === value
                const Icon = OFFER_TYPE_ICONS[value]
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pickOfferType(value)}
                    className={cn(perks.card(selected), 'min-h-[150px] flex flex-col items-start gap-3')}
                  >
                    <Icon className={perks.icon(selected)} aria-hidden="true" />
                    <span className="min-w-0 w-full space-y-1.5">
                      <span className="block font-sans text-[22px] font-bold leading-tight text-white break-words">
                        {opt.label}
                      </span>
                      <span className={cn(perks.sublineSmall, 'block break-words')}>{opt.subline}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <FieldErrorText id="offer-detail-offer_type" error={errors['details.offer_type']} />
          </div>

          {form.offerType === 'discount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className={cn(text.fieldLabel)}>What kind of discount?</p>
                <div
                  id="offer-detail-discount_type"
                  role="radiogroup"
                  aria-label="What kind of discount?"
                  className={cn('flex flex-wrap gap-3', errors['details.discount_type'] && groupErrorClass)}
                >
                  {PERK_OPTIONS.discountTypes.map((opt) => {
                    const selected = form.discountType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => pickDiscountType(opt.value as DiscountType)}
                        className={perks.chip(selected)}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <FieldErrorText id="offer-detail-discount_type" error={errors['details.discount_type']} />
              </div>

              {form.discountType && (
                <div className="space-y-2">
                  <label htmlFor="offer-detail-discount_value" className={cn(text.fieldLabel, 'block')}>
                    {form.discountType === 'percent' ? `Percent off (1 to ${LIMITS.discountPercent})` : 'Amount off'}
                  </label>
                  {form.discountType === 'percent' ? (
                    <div className="relative">
                      <input
                        id="offer-detail-discount_value"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={form.discountValue}
                        onChange={(e) =>
                          updateField('discountValue', e.target.value.replace(/\D/g, '').slice(0, 3), 'details.discount_value')
                        }
                        placeholder="20"
                        aria-invalid={!!errors['details.discount_value'] || undefined}
                        className={inputClass(!!errors['details.discount_value'], 'pr-12 text-lg font-bold')}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#59FFA0] pointer-events-none">
                        %
                      </span>
                    </div>
                  ) : (
                    <MoneyInput
                      id="offer-detail-discount_value"
                      value={form.discountValue}
                      onChange={(v) => updateField('discountValue', v, 'details.discount_value')}
                      suffix="off"
                      hasError={!!errors['details.discount_value']}
                    />
                  )}
                  <FieldErrorText id="offer-detail-discount_value" error={errors['details.discount_value']} />
                </div>
              )}
            </div>
          )}
        </PerkSection>

        {/* ── 2. Applies to ─────────────────────────────────────────────── */}
        <PerkSection title={COPY.appliesTo.title} question={COPY.appliesTo.question}>
          <div className="space-y-2">
            <div
              id="offer-detail-applies_to"
              role="group"
              aria-label={COPY.appliesTo.title}
              className={cn('flex flex-wrap gap-3', errors['details.applies_to'] && groupErrorClass)}
            >
              {PERK_OPTIONS.appliesTo.map((opt) => {
                const selected = form.appliesTo.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleApplies(opt.value)}
                    className={perks.chip(selected)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <FieldErrorText id="offer-detail-applies_to" error={errors['details.applies_to']} />
          </div>
        </PerkSection>

        {/* ── 3. Who is eligible ────────────────────────────────────────── */}
        <PerkSection title={COPY.eligible.title} question={COPY.eligible.question}>
          <div className="space-y-2">
            <div
              id="offer-detail-eligible"
              role="group"
              aria-label={COPY.eligible.title}
              className={cn('space-y-3', errors['details.eligible'] && groupErrorClass)}
            >
              {PERK_OPTIONS.eligible.map((opt) => {
                const selected = form.eligible.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => toggleEligible(opt.value)}
                    className={cn(perks.card(selected), 'flex items-center gap-4')}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center',
                        selected ? 'border-[#59FFA0] text-[#59FFA0]' : 'border-white/40'
                      )}
                    >
                      {selected && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block font-sans text-lg font-bold text-white">{opt.label}</span>
                      <span className={cn(perks.sublineSmall, 'block')}>{opt.subline}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <FieldErrorText id="offer-detail-eligible" error={errors['details.eligible']} />
          </div>
        </PerkSection>

        {/* ── 4. Monthly limit ──────────────────────────────────────────── */}
        <PerkSection title={COPY.monthly.title} question={COPY.monthly.question}>
          <div
            id="offer-detail-monthly_limit"
            role="radiogroup"
            aria-label={COPY.monthly.title}
            className={cn('space-y-4', errors['details.monthly_limit'] && groupErrorClass)}
          >
            <div className="grid grid-cols-3 gap-3">
              {MONTHLY_PRESETS.map((n) => {
                const choice = String(n) as MonthlyChoice
                const selected = form.monthlyChoice === choice
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pickMonthly(choice)}
                    className={cn(perks.card(selected), 'min-h-[104px] px-2 flex flex-col items-center justify-center text-center gap-1')}
                  >
                    <span
                      className={cn(
                        'font-header text-[40px] font-bold leading-none',
                        selected ? 'text-[#59FFA0]' : 'text-white'
                      )}
                    >
                      {n}
                    </span>
                    <span className="font-sans text-sm text-[#C4C4C8]">{PERK_OPTIONS.monthly.perMonth}</span>
                  </button>
                )
              })}
            </div>

            <p className={perks.question}>{COPY.monthly.alternatives}</p>

            <div className="flex flex-wrap gap-3">
              {alternatives.map((alt) => {
                const selected = form.monthlyChoice === alt.choice
                return (
                  <button
                    key={alt.choice}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pickMonthly(alt.choice)}
                    className={perks.chip(selected)}
                  >
                    {alt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <FieldErrorText id="offer-detail-monthly_limit" error={errors['details.monthly_limit']} />

          {form.monthlyChoice === 'custom' && (
            <div className="space-y-2">
              <label htmlFor="offer-detail-monthly_limit-custom" className={cn(text.fieldLabel, 'block')}>
                {PERK_OPTIONS.monthly.customLabel}
              </label>
              <div className="relative">
                <input
                  id="offer-detail-monthly_limit-custom"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={form.monthlyCustom}
                  onChange={(e) =>
                    updateField('monthlyCustom', e.target.value.replace(/\D/g, '').slice(0, 5), 'details.monthly_limit')
                  }
                  placeholder="15"
                  aria-invalid={!!errors['details.monthly_limit'] || undefined}
                  className={inputClass(!!errors['details.monthly_limit'], 'pr-28')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-sm text-[#C4C4C8] pointer-events-none">
                  {PERK_OPTIONS.monthly.perMonth}
                </span>
              </div>
            </div>
          )}
        </PerkSection>
      </div>
    </div>
  )
}
