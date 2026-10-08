'use client'

import type { ReactNode } from 'react'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS } from '@/hooks/useOfferWizard'
import type { AdaptiveField, CategoryFieldGroup } from './categoryFields'
import { PRICING_MODEL_OPTIONS } from './types'
import { Field, describedBy } from './Field'
import { ChipSelect } from './ChipSelect'
import { CountedTextarea } from './CountedTextarea'
import { MoneyInput } from './MoneyInput'
import { NumberInput } from './NumberInput'
import { ListEditor } from './ListEditor'
import { cardClass, inputClass } from './styles'

interface OfferDetailsStepProps {
  form: OfferForm
  errors: FieldErrors
  group: CategoryFieldGroup | null
  categoryName: string | null
  reviewNotice?: string | null
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], errorKey?: string) => void
  setDetail: (key: string, value: string) => void
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-5 space-y-5`}>
      <div className="space-y-0.5">
        <h2 className="font-header text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="font-sans text-sm text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

const PRICE_HINTS: Record<string, string> = {
  flat: 'One price for the whole package.',
  per_person: 'Price for each guest.',
  starting_at: 'Your lowest price. Final cost depends on the party.',
}

function AdaptiveInput({
  field,
  value,
  error,
  onChange,
}: {
  field: AdaptiveField
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const id = `offer-detail-${field.key}`
  const aria = describedBy(id, error, field.hint)

  let control: ReactNode
  switch (field.kind) {
    case 'money':
      control = <MoneyInput id={id} value={value} onChange={onChange} hasError={!!error} describedById={aria} />
      break
    case 'integer':
      control = (
        <NumberInput
          id={id}
          value={value}
          onChange={onChange}
          suffix={field.suffix}
          hasError={!!error}
          describedById={aria}
        />
      )
      break
    case 'text':
      control = field.multiline ? (
        <CountedTextarea
          id={id}
          value={value}
          onChange={onChange}
          maxLength={field.maxLength}
          rows={3}
          placeholder={field.placeholder}
          hasError={!!error}
          describedById={aria}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={field.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={!!error || undefined}
          aria-describedby={aria}
          className={inputClass(!!error)}
        />
      )
      break
    case 'chips':
      control = (
        <ChipSelect
          id={id}
          label={field.label}
          options={field.options}
          value={value || null}
          onChange={(v) => onChange(v ?? '')}
        />
      )
      break
  }

  return (
    <Field id={id} label={field.label} hint={field.hint} error={error} optional>
      {control}
    </Field>
  )
}

export function OfferDetailsStep({
  form,
  errors,
  group,
  categoryName,
  reviewNotice,
  updateField,
  setDetail,
}: OfferDetailsStepProps) {
  const priceHint = (form.pricingModel && PRICE_HINTS[form.pricingModel]) || 'What a birthday group pays.'

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-header text-3xl font-bold text-white leading-tight">Create your offer</h1>
        <p className="font-sans text-base text-white/70">
          This is what birthday planners will see. Make it sound like something worth celebrating.
        </p>
      </div>

      {reviewNotice && (
        <div className="p-4 rounded-xl border bg-[#FFB547]/10 border-[#FFB547]/30 text-sm font-sans text-[#FFB547]">
          {reviewNotice}
        </div>
      )}

      <Section title="The basics">
        <Field
          id="offer-title"
          label="Offer name"
          error={errors.title}
          hint={`${form.title.length}/${LIMITS.title}`}
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
            placeholder="What makes a birthday here special? Set the scene."
            hasError={!!errors.description}
            describedById={describedBy('offer-description', errors.description)}
          />
        </Field>
      </Section>

      <Section title="Pricing">
        <Field id="offer-pricing-model" label="How is it priced?" error={errors.pricing_model} optional>
          <ChipSelect
            id="offer-pricing-model"
            label="How is it priced?"
            options={PRICING_MODEL_OPTIONS}
            value={form.pricingModel}
            onChange={(v) => updateField('pricingModel', v, 'pricing_model')}
          />
        </Field>

        <Field id="offer-price" label="Price" hint={priceHint} error={errors.price}>
          <MoneyInput
            id="offer-price"
            value={form.price}
            onChange={(v) => updateField('price', v, 'price')}
            hasError={!!errors.price}
            describedById={describedBy('offer-price', errors.price, priceHint)}
          />
        </Field>
      </Section>

      <Section title="What’s included" subtitle="The good stuff. One item per line.">
        <Field id="offer-includes" label="Included items" error={errors.includes} optional>
          <ListEditor
            id="offer-includes"
            items={form.includes}
            onChange={(items) => updateField('includes', items, 'includes')}
            max={LIMITS.includesItems}
            maxItemLength={LIMITS.includesItemLength}
            placeholder="e.g. Reserved table for 12"
            hasError={!!errors.includes}
            describedById={describedBy('offer-includes', errors.includes)}
          />
        </Field>
      </Section>

      <Section title="Party size & timing">
        <div className="grid grid-cols-2 gap-3">
          <Field id="offer-min-guests" label="Min guests" error={errors.min_guests} optional>
            <NumberInput
              id="offer-min-guests"
              value={form.minGuests}
              onChange={(v) => updateField('minGuests', v, 'min_guests')}
              hasError={!!errors.min_guests}
              describedById={describedBy('offer-min-guests', errors.min_guests)}
            />
          </Field>
          <Field id="offer-max-guests" label="Max guests" error={errors.max_guests} optional>
            <NumberInput
              id="offer-max-guests"
              value={form.maxGuests}
              onChange={(v) => updateField('maxGuests', v, 'max_guests')}
              hasError={!!errors.max_guests}
              describedById={describedBy('offer-max-guests', errors.max_guests)}
            />
          </Field>
        </div>

        <Field id="offer-duration" label="How long is it?" error={errors.duration_hours} optional>
          <NumberInput
            id="offer-duration"
            kind="decimal"
            suffix="hours"
            value={form.durationHours}
            onChange={(v) => updateField('durationHours', v, 'duration_hours')}
            hasError={!!errors.duration_hours}
            describedById={describedBy('offer-duration', errors.duration_hours)}
          />
        </Field>

        <Field
          id="offer-advance-notice"
          label="Notice you need"
          hint="How far ahead someone should book, e.g. 48 for two days."
          error={errors.advance_notice_hours}
          optional
        >
          <NumberInput
            id="offer-advance-notice"
            suffix="hours"
            value={form.advanceNoticeHours}
            onChange={(v) => updateField('advanceNoticeHours', v, 'advance_notice_hours')}
            hasError={!!errors.advance_notice_hours}
            describedById={describedBy('offer-advance-notice', errors.advance_notice_hours, 'hint')}
          />
        </Field>
      </Section>

      {group && (
        <Section title={group.heading} subtitle={categoryName ? `Just for ${categoryName}.` : undefined}>
          {errors.details && (
            <p role="alert" className="text-xs text-red-400">
              {errors.details}
            </p>
          )}
          {group.fields.map((field) => (
            <AdaptiveInput
              key={field.key}
              field={field}
              value={form.details[field.key] ?? ''}
              error={errors[`details.${field.key}`]}
              onChange={(v) => setDetail(field.key, v)}
            />
          ))}
        </Section>
      )}
    </div>
  )
}
