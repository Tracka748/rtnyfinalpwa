'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { FieldErrors, OfferForm, RequirementValue } from '@/hooks/useOfferWizard'
import { LIMITS } from '@/hooks/useOfferWizard'
import {
  DURATION_OPTIONS,
  GUEST_OPTIONS,
  NOTICE_OPTIONS,
  guestLabel,
  type CategoryConfig,
  type ChipOption,
  type RequirementField,
} from './categoryFields'
import { PRICED_MODELS, PRICING_MODEL_OPTIONS } from './types'
import { Field, NeededTag, describedBy } from './Field'
import { ChipSelect } from './ChipSelect'
import { CountedTextarea } from './CountedTextarea'
import { MoneyInput } from './MoneyInput'
import { ListEditor } from './ListEditor'
import { cn } from '@/lib/utils'
import { cardClass, inputClass, space, text } from './styles'
import { SectionCard as Section } from './SectionCard'
import { FINE_TUNE_COPY } from './sectionCopy'
import {
  appliesToLabel,
  discountTerms,
  eligibleLabel,
  generatedIncludes,
  monthlyLimitWording,
  offerTypeLabel,
} from './perks'

interface OfferDetailsStepProps {
  form: OfferForm
  errors: FieldErrors
  config: CategoryConfig
  categoryName: string | null
  legacyNotes: { key: string; label: string; value: string }[]
  reviewNotice?: string | null
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => void
  setRequirement: (key: string, value: RequirementValue) => void
  onEditPerks: () => void
  onSwitchPricingMode: (mode: 'perks' | 'fixed') => void
}

const summaryChipClass =
  'px-3 py-1.5 rounded-full bg-white/5 border border-white/15 font-sans text-sm text-white/85 max-w-full break-words'

const switchButtonClass =
  'min-h-12 px-4 rounded-xl border border-[#1AC8ED]/40 text-[#1AC8ED] font-sans text-base font-medium hover:bg-[#1AC8ED]/10 transition-colors'

// Read-only chips summarizing the perks-step answers.
function perkSummaryChips(form: OfferForm): string[] {
  const value = Number(form.discountValue)
  const terms = form.offerType === 'discount' ? discountTerms(form.discountType, Number.isFinite(value) ? value : null) : null
  return [
    form.offerType ? (terms ? `${offerTypeLabel(form.offerType)}: ${terms}` : offerTypeLabel(form.offerType)) : null,
    ...form.appliesTo.map(appliesToLabel),
    ...form.eligible.map(eligibleLabel),
    monthlyLimitWording(
      form.monthlyChoice === 'custom'
        ? Number(form.monthlyCustom) || null
        : form.monthlyChoice && /^\d+$/.test(form.monthlyChoice)
          ? Number(form.monthlyChoice)
          : null,
      form.monthlyChoice === 'unlimited' || form.monthlyChoice === 'confirm_each' ? form.monthlyChoice : null
    ),
  ].filter((c): c is string => !!c)
}

// Adds the current value as an extra chip when it isn't one of the presets
// (e.g. an older offer saved with 12 guests), so it stays visibly selected.
function withCurrent(options: { value: string; label: string }[], current: string | null) {
  if (!current || options.some((o) => o.value === current)) return options
  return [...options, { value: current, label: current }]
}

function applyExclusions(options: ChipOption[], prev: string[], next: string[]): string[] {
  const added = next.find((v) => !prev.includes(v))
  const excludes = options.find((o) => o.value === added)?.excludes
  return excludes ? next.filter((v) => !excludes.includes(v)) : next
}

const PRICE_SUFFIX: Record<string, string | undefined> = { per_person: 'per person' }
const PRICE_HINTS: Record<string, string> = {
  flat: 'One price for the whole package.',
  per_person: 'Price for each guest.',
  starting_at: 'Your lowest price. Final cost depends on the party.',
}

function RequirementInput({
  field,
  value,
  error,
  onChange,
}: {
  field: RequirementField
  value: RequirementValue | undefined
  error?: string
  onChange: (value: RequirementValue) => void
}) {
  const id = `offer-detail-${field.key}`
  const str = typeof value === 'string' ? value : ''
  const list = Array.isArray(value) ? value : []

  switch (field.kind) {
    case 'money':
      return (
        <Field id={id} label={field.label} hint={field.hint} error={error} optional>
          <MoneyInput
            id={id}
            value={str}
            onChange={onChange}
            hasError={!!error}
            describedById={describedBy(id, error, field.hint)}
          />
        </Field>
      )
    case 'number':
      return (
        <Field id={id} label={field.label} error={error} optional group>
          <ChipSelect
            id={id}
            label={field.label}
            options={withCurrent(
              field.options.map((o) => ({ value: String(o.value), label: o.label })),
              str || null
            )}
            value={str || null}
            onChange={(v) => onChange(v ?? '')}
          />
        </Field>
      )
    case 'choice':
      return (
        <Field id={id} label={field.label} error={error} optional group>
          <ChipSelect id={id} label={field.label} options={field.options} value={str || null} onChange={(v) => onChange(v ?? '')} />
        </Field>
      )
    case 'multi':
      return (
        <Field id={id} label={field.label} hint="Pick all that apply." error={error} optional group>
          <ChipSelect
            id={id}
            label={field.label}
            multiple
            max={LIMITS.detailListItems}
            options={field.options}
            value={list}
            onChange={(next) => onChange(applyExclusions(field.options, list, next))}
          />
        </Field>
      )
    case 'note':
      return (
        <Field id={id} label={field.label} error={error} optional>
          <CountedTextarea
            id={id}
            value={str}
            onChange={onChange}
            maxLength={field.maxLength}
            rows={2}
            placeholder={field.placeholder}
            hasError={!!error}
            describedById={describedBy(id, error)}
          />
        </Field>
      )
  }
}

function EarlierNotes({ notes }: { notes: { key: string; label: string; value: string }[] }) {
  if (notes.length === 0) return null
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2">
      <p className={cn(text.eyebrow, 'text-white/60')}>Earlier notes</p>
      {notes.map((n) => (
        <p key={n.key} className="text-base text-white/75 font-sans break-words">
          <span className="text-white/60">{n.label}: </span>
          {n.value}
        </p>
      ))}
    </div>
  )
}

export function OfferDetailsStep({
  form,
  errors,
  config,
  categoryName,
  legacyNotes,
  reviewNotice,
  updateField,
  setRequirement,
  onEditPerks,
  onSwitchPricingMode,
}: OfferDetailsStepProps) {
  const perksMode = form.pricingMode === 'perks'
  const priced = !!form.pricingModel && PRICED_MODELS.has(form.pricingModel)
  const priceHint = (form.pricingModel && PRICE_HINTS[form.pricingModel]) || undefined
  // Entries the perks step generated from "applies to" (matched by label) vs. ones the
  // partner typed. Only typed entries live under the "Something else" header.
  const autoLabels = new Set(generatedIncludes(form.appliesTo).map((l) => l.toLowerCase()))
  const isAuto = (item: string) => autoLabels.has(item.trim().toLowerCase())
  const autoEntries = form.customIncludes.filter(isAuto)
  const typedEntries = form.customIncludes.filter((i) => !isAuto(i))
  const [showCustom, setShowCustom] = useState(typedEntries.length > 0)
  const includesCount = form.includePresets.length + form.customIncludes.length
  const requirements = config.requirements

  // True when the min/max rule disables at least one chip in that group.
  const minRuledOut = form.maxGuests !== null && GUEST_OPTIONS.some((n) => n > (form.maxGuests as number))
  const maxRuledOut = form.minGuests !== null && GUEST_OPTIONS.some((n) => n < (form.minGuests as number))

  const guestOptions = (other: number | null, isMin: boolean, current: number | null) =>
    withCurrent(
      GUEST_OPTIONS.map((n) => ({
        value: String(n),
        label: guestLabel(n),
        disabled: other !== null && (isMin ? n > other : n < other),
      })),
      current !== null ? String(current) : null
    )

  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>{FINE_TUNE_COPY.headline}</h1>
        <p className={text.body}>{FINE_TUNE_COPY.body}</p>
      </div>

      {form.autoFields.length > 0 && (
        <div className="p-4 rounded-xl border border-[#59FFA0]/30 bg-[#59FFA0]/10 font-sans text-base text-[#B8F5DC]">
          {FINE_TUNE_COPY.autoNote}
        </div>
      )}

      {/* ── Birthday perk summary (replaces the pricing controls while using perks) ── */}
      {perksMode && (
        <Section id="offer-pricing-model" copyKey="perkSummary" title="Your birthday perk">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className={text.questionLabel}>Your answers</p>
              <button
                type="button"
                onClick={onEditPerks}
                className="min-h-12 px-3 -mr-3 shrink-0 font-sans text-base font-medium text-[#1AC8ED] hover:underline"
              >
                Edit
              </button>
            </div>
            {perkSummaryChips(form).length ? (
              <ul className="flex flex-wrap gap-2">
                {perkSummaryChips(form).map((chip) => (
                  <li key={chip} className={summaryChipClass}>
                    {chip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={text.helper}>No perk answers yet.</p>
            )}
            {errors.pricing_model && <p role="alert" className={text.error}>{errors.pricing_model}</p>}
          </div>
          <button type="button" onClick={() => onSwitchPricingMode('fixed')} className={switchButtonClass}>
            {FINE_TUNE_COPY.switchToFixed}
          </button>
        </Section>
      )}

      {reviewNotice && (
        <div className="p-4 rounded-xl border bg-[#FFB547]/10 border-[#FFB547]/30 text-base font-sans text-[#FFB547]">
          {reviewNotice}
        </div>
      )}

      {/* ── The basics ─────────────────────────────────────────────────── */}
      <Section copyKey="basics" title="The basics">
        <Field
          id="offer-title"
          label="Offer name"
          error={errors.title}
          hint={`${form.title.length}/${LIMITS.title}`}
          neededToSubmit
        >
          <input
            id="offer-title"
            type="text"
            value={form.title}
            maxLength={LIMITS.title}
            onChange={(e) => updateField('title', e.target.value, 'title')}
            placeholder="e.g. Rooftop Birthday Bash"
            aria-invalid={!!errors.title || undefined}
            aria-describedby={describedBy('offer-title', errors.title, 'hint')}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field id="offer-description" label="Short description" error={errors.description} optional>
          <CountedTextarea
            id="offer-description"
            value={form.description}
            onChange={(v) => updateField('description', v, 'description')}
            maxLength={LIMITS.description}
            rows={3}
            placeholder="One or two lines that make someone want to celebrate here."
            hasError={!!errors.description}
            describedById={describedBy('offer-description', errors.description)}
          />
        </Field>
      </Section>

      {/* ── Fixed pricing ("Switch to a fixed price") ──────────────────── */}
      {!perksMode && (
      <Section copyKey="pricing" title="Pricing" tag={<NeededTag />}>
        <Field id="offer-pricing-model" label="How is it priced?" error={errors.pricing_model} group>
          <ChipSelect
            id="offer-pricing-model"
            label="How is it priced?"
            options={PRICING_MODEL_OPTIONS}
            value={form.pricingModel}
            onChange={(v) => updateField('pricingModel', v, 'pricing_model', 'price')}
          />
        </Field>

        {priced && (
          <Field id="offer-price" label="Price" hint={priceHint} error={errors.price}>
            <MoneyInput
              id="offer-price"
              value={form.price}
              onChange={(v) => updateField('price', v, 'price')}
              suffix={form.pricingModel ? PRICE_SUFFIX[form.pricingModel] : undefined}
              hasError={!!errors.price}
              describedById={describedBy('offer-price', errors.price, priceHint)}
            />
          </Field>
        )}
        {form.pricingModel === 'contact' && (
          <p className={text.helper}>Guests will reach out to you for a quote.</p>
        )}
        <button type="button" onClick={() => onSwitchPricingMode('perks')} className={switchButtonClass}>
          {FINE_TUNE_COPY.switchToPerks}
        </button>
      </Section>
      )}

      {/* ── What's included ────────────────────────────────────────────── */}
      <Section copyKey="included" title="What’s included" tag={<NeededTag />}>
        <Field id="offer-includes" label="Included" error={errors.includes} group>
          <ChipSelect
            id="offer-includes"
            label="What’s included"
            multiple
            max={LIMITS.includesItems - form.customIncludes.length}
            options={config.includePresets.map((p) => ({ value: p, label: p }))}
            value={form.includePresets}
            onChange={(v) => updateField('includePresets', v, 'includes')}
          />
        </Field>

        {autoEntries.length > 0 && (
          <ul className="space-y-2">
            {autoEntries.map((item) => (
              <li key={item} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg pl-4">
                <span className="flex-1 min-w-0 py-2.5">
                  <span className="block text-base text-white font-sans break-words">{item}</span>
                  <span className="mt-1 inline-block rounded bg-[#59FFA0]/10 px-2 py-0.5 font-label text-xs font-semibold text-[#59FFA0]">
                    {FINE_TUNE_COPY.fromAnswersTag}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField('customIncludes', form.customIncludes.filter((i) => i !== item), 'includes')
                  }
                  aria-label={`Remove ${item}`}
                  className="w-12 h-12 shrink-0 flex items-center justify-center text-white/60 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {showCustom ? (
          <div className={space.field}>
            <p className={text.questionLabel}>Something else</p>
            <ListEditor
              id="offer-includes-custom"
              items={typedEntries}
              onChange={(items) => updateField('customIncludes', [...autoEntries, ...items], 'includes')}
              max={Math.max(0, LIMITS.includesItems - form.includePresets.length - autoEntries.length)}
              maxItemLength={LIMITS.includesItemLength}
              placeholder="e.g. Glow sticks for the group"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            disabled={includesCount >= LIMITS.includesItems}
            className="min-h-[52px] px-5 rounded-full border border-dashed border-[#1AC8ED]/50 text-[#1AC8ED] text-base font-sans font-medium inline-flex items-center gap-2 hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add something else
          </button>
        )}
      </Section>

      {/* ── Group size ─────────────────────────────────────────────────── */}
      <Section copyKey="groupSize" title="Group size">
        <Field
          id="offer-min-guests"
          label="Minimum guests"
          error={errors.min_guests}
          hint={minRuledOut ? FINE_TUNE_COPY.guestRuleHint : undefined}
          optional
          group
        >
          <ChipSelect
            id="offer-min-guests"
            label="Minimum guests"
            options={guestOptions(form.maxGuests, true, form.minGuests)}
            value={form.minGuests !== null ? String(form.minGuests) : null}
            onChange={(v) => updateField('minGuests', v ? Number(v) : null, 'min_guests', 'max_guests')}
          />
        </Field>
        <Field
          id="offer-max-guests"
          label="Maximum guests"
          error={errors.max_guests}
          hint={maxRuledOut ? FINE_TUNE_COPY.guestRuleHint : undefined}
          neededToSubmit
          group
        >
          <ChipSelect
            id="offer-max-guests"
            label="Maximum guests"
            options={guestOptions(form.minGuests, false, form.maxGuests)}
            value={form.maxGuests !== null ? String(form.maxGuests) : null}
            onChange={(v) => updateField('maxGuests', v ? Number(v) : null, 'max_guests', 'min_guests')}
          />
        </Field>
      </Section>

      {/* ── Booking ────────────────────────────────────────────────────── */}
      <Section copyKey="booking" title="Booking">
        <Field id="offer-duration" label="How long is it?" error={errors.duration_hours} optional group>
          <ChipSelect
            id="offer-duration"
            label="How long is it?"
            options={DURATION_OPTIONS.map((o) => ({ value: o.label, label: o.label }))}
            value={form.durationLabel}
            onChange={(v) => updateField('durationLabel', v, 'duration_hours')}
          />
        </Field>
        <Field
          id="offer-advance-notice"
          label="How much notice do you need?"
          error={errors.advance_notice_hours}
          optional
          group
        >
          <ChipSelect
            id="offer-advance-notice"
            label="How much notice do you need?"
            options={NOTICE_OPTIONS.map((o) => ({ value: o.label, label: o.label }))}
            value={form.noticeLabel}
            onChange={(v) => updateField('noticeLabel', v, 'advance_notice_hours')}
          />
        </Field>
      </Section>

      {/* ── Additional requirements (adaptive) ─────────────────────────── */}
      {requirements ? (
        <Section
          id="offer-requirements"
          copyKey="requirements"
         
          title={requirements.heading}
          note={categoryName ? `Just for ${categoryName}.` : undefined}
        >
          {errors.details && (
            <p role="alert" className={text.error}>
              {errors.details}
            </p>
          )}
          {requirements.fields.map((field) => (
            <RequirementInput
              key={field.key}
              field={field}
              value={form.requirements[field.key]}
              error={errors[`details.${field.key}`]}
              onChange={(v) => setRequirement(field.key, v)}
            />
          ))}
          <EarlierNotes notes={legacyNotes} />
        </Section>
      ) : (
        legacyNotes.length > 0 && (
          <div id="offer-requirements" className={`${cardClass} p-5`}>
            <EarlierNotes notes={legacyNotes} />
          </div>
        )
      )}
    </div>
  )
}
