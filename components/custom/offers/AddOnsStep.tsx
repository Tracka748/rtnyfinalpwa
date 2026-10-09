'use client'

import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS, addOnSlug, newCustomAddOnId } from '@/hooks/useOfferWizard'
import type { CategoryConfig } from './categoryFields'
import { SectionCard } from './SectionCard'
import { Field, describedBy } from './Field'
import { ChipSelect } from './ChipSelect'
import { MoneyInput } from './MoneyInput'
import { inputClass, space, text } from './styles'

interface AddOnsStepProps {
  form: OfferForm
  errors: FieldErrors
  config: CategoryConfig
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => void
}

export function AddOnsStep({ form, errors, config, updateField }: AddOnsStepProps) {
  const selected = config.addOnPresets.filter((name) => name in form.addOnPresets)
  const total = selected.length + form.customAddOns.length
  const full = total >= LIMITS.addOns

  const setPresets = (names: string[]) => {
    const next: Record<string, string> = {}
    for (const name of names) next[name] = form.addOnPresets[name] ?? ''
    const removed = selected.filter((n) => !names.includes(n)).map((n) => `add_ons.${addOnSlug(n)}`)
    updateField('addOnPresets', next, 'add_ons', ...removed)
  }

  const setPresetPrice = (name: string, price: string) =>
    updateField('addOnPresets', { ...form.addOnPresets, [name]: price }, `add_ons.${addOnSlug(name)}`)

  const updateCustom = (id: string, patch: Partial<{ name: string; price: string }>) =>
    updateField(
      'customAddOns',
      form.customAddOns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      `add_ons.${id}`
    )

  const removeCustom = (id: string) =>
    updateField('customAddOns', form.customAddOns.filter((c) => c.id !== id), `add_ons.${id}`, 'add_ons')

  const addCustom = () =>
    updateField('customAddOns', [...form.customAddOns, { id: newCustomAddOnId(), name: '', price: '' }], 'add_ons')

  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>Add-ons</h1>
        <p className={text.body}>Extras a birthday group can add when they book.</p>
      </div>

      <SectionCard id="offer-addons" copyKey="addOns" title="Extras">
        {errors.add_ons && (
          <p role="alert" className={text.error}>
            {errors.add_ons}
          </p>
        )}

        <Field id="offer-addon-presets" label="Popular add-ons" optional group>
          <ChipSelect
            id="offer-addon-presets"
            label="Popular add-ons"
            multiple
            max={LIMITS.addOns - form.customAddOns.length}
            options={config.addOnPresets.map((name) => ({ value: name, label: name }))}
            value={selected}
            onChange={setPresets}
          />
        </Field>

        {selected.map((name) => {
          const slug = addOnSlug(name)
          const id = `offer-addon-${slug}`
          const error = errors[`add_ons.${slug}`]
          return (
            <Field key={name} id={id} label={`${name} price`} error={error}>
              <MoneyInput
                id={id}
                value={form.addOnPresets[name] ?? ''}
                onChange={(v) => setPresetPrice(name, v)}
                hasError={!!error}
                describedById={describedBy(id, error)}
              />
            </Field>
          )
        })}

        {form.customAddOns.map((c, i) => {
          const rowId = `offer-addon-${c.id}`
          const error = errors[`add_ons.${c.id}`]
          return (
            <div key={c.id} id={rowId} className={space.field}>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`${rowId}-name`} className={text.questionLabel}>
                  Something else {form.customAddOns.length > 1 ? i + 1 : ''}
                </label>
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  aria-label={`Remove ${c.name.trim() || 'this add-on'}`}
                  className="w-12 h-12 -mr-3 shrink-0 flex items-center justify-center text-white/60 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                id={`${rowId}-name`}
                type="text"
                value={c.name}
                maxLength={LIMITS.addOnName}
                onChange={(e) => updateCustom(c.id, { name: e.target.value })}
                placeholder="e.g. Glow sticks for the group"
                aria-invalid={!!error || undefined}
                className={inputClass(!!error)}
              />
              <MoneyInput
                id={`${rowId}-price`}
                value={c.price}
                onChange={(v) => updateCustom(c.id, { price: v })}
                hasError={!!error}
                describedById={error ? `${rowId}-error` : undefined}
              />
              {error && (
                <p id={`${rowId}-error`} role="alert" className={text.error}>
                  {error}
                </p>
              )}
            </div>
          )
        })}

        <div className="space-y-2">
          <button
            type="button"
            onClick={addCustom}
            disabled={full}
            className="min-h-[52px] px-5 rounded-full border border-dashed border-[#1AC8ED]/50 text-[#1AC8ED] text-base font-sans font-medium inline-flex items-center gap-2 hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add something else
          </button>
          <p className={cn(text.helper, 'tabular-nums')}>
            {total}/{LIMITS.addOns} add-ons{full ? ' · That’s the max' : ''}
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
