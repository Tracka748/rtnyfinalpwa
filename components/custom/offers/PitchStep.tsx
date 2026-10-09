'use client'

import { cn } from '@/lib/utils'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS } from '@/hooks/useOfferWizard'
import type { CategoryConfig } from './categoryFields'
import { PITCH_STARTERS } from './sectionCopy'
import { SectionCard } from './SectionCard'
import { Field, NeededTag, describedBy } from './Field'
import { CountedTextarea } from './CountedTextarea'
import { space, text } from './styles'

interface PitchStepProps {
  form: OfferForm
  errors: FieldErrors
  config: CategoryConfig
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => void
}

export function PitchStep({ form, errors, config, updateField }: PitchStepProps) {
  const starters = PITCH_STARTERS[config.kind]

  const applyStarter = (line: string) => {
    updateField('pitch', line.slice(0, LIMITS.pitch), 'pitch')
    // Put the cursor at the end so the partner can keep typing.
    requestAnimationFrame(() => {
      const box = document.getElementById('offer-pitch') as HTMLTextAreaElement | null
      if (!box) return
      box.focus()
      box.setSelectionRange(box.value.length, box.value.length)
    })
  }

  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>Why you</h1>
        <p className={text.body}>Your pitch is the line Specialists read before they recommend you.</p>
      </div>

      <SectionCard copyKey="pitch" title="Why should someone choose you for their birthday?" tag={<NeededTag />}>
        <div className={space.field}>
          <p className={text.questionLabel}>Start from one of these</p>
          <ul className="space-y-3">
            {starters.map((line) => (
              <li key={line}>
                <button
                  type="button"
                  onClick={() => applyStarter(line)}
                  className={cn(
                    'w-full min-h-12 rounded-xl border px-4 py-3 text-left font-sans text-base leading-relaxed transition-colors',
                    form.pitch.trim() === line
                      ? 'border-[#59FFA0] bg-[#59FFA0]/10 text-[#59FFA0]'
                      : 'border-white/25 text-[#F9FDFF] hover:border-white/50'
                  )}
                >
                  “{line}”
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Field id="offer-pitch" label="Your pitch" error={errors.pitch} neededToSubmit>
          <CountedTextarea
            id="offer-pitch"
            value={form.pitch}
            onChange={(v) => updateField('pitch', v, 'pitch')}
            maxLength={LIMITS.pitch}
            rows={4}
            placeholder="In a sentence or two, why is your place the one to pick?"
            hasError={!!errors.pitch}
            describedById={describedBy('offer-pitch', errors.pitch)}
          />
        </Field>
      </SectionCard>
    </div>
  )
}
