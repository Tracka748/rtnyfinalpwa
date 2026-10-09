'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimePicker } from '@/components/ui/time-picker/TimePicker'
import type { FieldErrors, OfferForm } from '@/hooks/useOfferWizard'
import { LIMITS } from '@/hooks/useOfferWizard'
import { DAY_OPTIONS, RADIUS_OPTIONS } from './categoryFields'
import { SectionCard } from './SectionCard'
import { Field, NeededTag } from './Field'
import { ChipSelect } from './ChipSelect'
import { chipClass, inputClass, space, text } from './styles'

interface AvailabilityStepProps {
  form: OfferForm
  errors: FieldErrors
  travels: boolean
  updateField: <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => void
}

// TimePicker speaks "H:MM AM/PM"; availability stores "HH:MM".
export function toDisplayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function fromDisplayTime(display: string): string | null {
  const match = display.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let h = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${match[2]}`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AvailabilityStep({ form, errors, travels, updateField }: AvailabilityStepProps) {
  const [newDate, setNewDate] = useState('')
  const hasHours = form.startTime !== null && form.endTime !== null
  const overnight = hasHours && (form.endTime as string) <= (form.startTime as string)
  const satisfied = form.days.length > 0 || form.confirmEach
  const datesFull = form.blackoutDates.length >= LIMITS.blackoutDates

  const addDate = () => {
    if (!newDate || form.blackoutDates.includes(newDate) || datesFull) return
    updateField('blackoutDates', [...form.blackoutDates, newDate].sort(), 'availability')
    setNewDate('')
  }

  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>Availability</h1>
        <p className={text.body}>Set when birthday groups can book you.</p>
      </div>

      <SectionCard id="offer-availability" copyKey="availability" title="When can people book?" tag={<NeededTag />}>
        {errors.availability && (
          <p role="alert" className={text.error}>
            {errors.availability}
          </p>
        )}

        {/* Prominent switch: confirming each booking makes days/times optional. */}
        <button
          type="button"
          role="switch"
          aria-checked={form.confirmEach}
          onClick={() => updateField('confirmEach', !form.confirmEach, 'availability')}
          className={cn(
            'w-full min-h-[64px] rounded-xl border px-4 py-3 flex items-center gap-4 text-left transition-colors',
            form.confirmEach ? 'border-[#59FFA0] bg-[#59FFA0]/10' : 'border-white/20 hover:border-white/40'
          )}
        >
          <span className="flex-1 min-w-0">
            <span className={cn(text.questionLabel, 'block')}>I’ll confirm each booking</span>
            <span className={cn(text.helper, 'block mt-0.5')}>
              Specialists send a request and you say yes or no. Days and times become optional.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'relative w-12 h-7 shrink-0 rounded-full transition-colors',
              form.confirmEach ? 'bg-[#59FFA0]' : 'bg-white/20'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-[#121113] transition-all',
                form.confirmEach ? 'left-6' : 'left-1'
              )}
            />
          </span>
        </button>

        <Field
          id="offer-days"
          label="Days you take birthdays"
          hint={satisfied ? undefined : 'Pick at least one day, or turn on confirm each booking.'}
          neededToSubmit={!form.confirmEach}
          optional={form.confirmEach}
          group
        >
          <ChipSelect
            id="offer-days"
            label="Days you take birthdays"
            multiple
            options={DAY_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
            value={form.days.map(String)}
            onChange={(v) => updateField('days', v.map(Number), 'availability')}
          />
        </Field>

        <Field
          id="offer-hours"
          label="Hours"
          hint={overnight ? 'Ends after midnight. Late nights are fine.' : undefined}
          optional
          group
        >
          {hasHours ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className={text.helper}>Starts</p>
                <TimePicker
                  key="start"
                  value={toDisplayTime(form.startTime as string)}
                  onChange={(v) => updateField('startTime', fromDisplayTime(v) ?? form.startTime)}
                />
              </div>
              <div className="space-y-2">
                <p className={text.helper}>Ends</p>
                <TimePicker
                  key="end"
                  value={toDisplayTime(form.endTime as string)}
                  onChange={(v) => updateField('endTime', fromDisplayTime(v) ?? form.endTime)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  updateField('startTime', null)
                  updateField('endTime', null)
                }}
                className="min-h-12 text-base font-sans font-medium text-[#1AC8ED] hover:underline"
              >
                Remove hours
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                updateField('startTime', '17:00')
                updateField('endTime', '22:00')
              }}
              className={cn(chipClass(false), 'inline-flex items-center gap-2')}
            >
              <Plus className="w-4 h-4" />
              Set hours
            </button>
          )}
        </Field>
      </SectionCard>

      <SectionCard copyKey="reach" title={travels ? 'Blackout dates & reach' : 'Blackout dates'}>
        <Field id="offer-blackout" label="Dates you’re unavailable" optional>
          <div className="flex gap-2">
            <input
              id="offer-blackout"
              type="date"
              min={todayIso()}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={datesFull}
              className={inputClass(false, 'flex-1 [color-scheme:dark]')}
            />
            <button
              type="button"
              onClick={addDate}
              disabled={!newDate || datesFull || form.blackoutDates.includes(newDate)}
              className="min-h-12 px-4 shrink-0 rounded-lg border border-[#1AC8ED]/40 text-[#1AC8ED] text-base font-sans font-medium inline-flex items-center gap-1.5 hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </Field>

        {form.blackoutDates.length > 0 && (
          <ul className={cn('flex flex-wrap', space.chips)}>
            {form.blackoutDates.map((d) => (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => updateField('blackoutDates', form.blackoutDates.filter((x) => x !== d), 'availability')}
                  aria-label={`Remove ${formatDate(d)}`}
                  className={cn(chipClass(false), 'inline-flex items-center gap-2')}
                >
                  {formatDate(d)}
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {travels && (
          <Field id="offer-radius" label="How far will you travel?" optional group>
            <ChipSelect
              id="offer-radius"
              label="How far will you travel?"
              options={RADIUS_OPTIONS.map((r) => ({ value: String(r.value), label: r.label }))}
              value={form.radiusMiles !== null ? String(form.radiusMiles) : null}
              onChange={(v) => updateField('radiusMiles', v ? Number(v) : null)}
            />
          </Field>
        )}
      </SectionCard>
    </div>
  )
}
