'use client'

import { useId } from 'react'
import { Check, ImageOff, TriangleAlert } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { describePricing, type LinePrice } from '@/lib/package-page-format'
import { availableOptions, canToggle, isRequired, isSwappable, type ComponentChoice } from '@/lib/package-selection'
import { safeExternalUrl } from '@/lib/safe-url'
import type { PublicComponent } from '@/lib/theme-package-public'
import { cn } from '@/lib/utils'

interface Props {
  component: PublicComponent
  choice: ComponentChoice
  line: LinePrice
  guestFit: boolean | null
  groupSize: number
  onToggle: () => void
  onSwap: (optionId: string) => void
}

const TONE: Record<LinePrice['tone'], string> = {
  price: 'text-accent-primary',
  free: 'text-accent-secondary',
  quote: 'text-text-secondary',
}

export function ComponentCard({ component: c, choice, line, guestFit, groupSize, onToggle, onSwap }: Props) {
  const switchId = useId()
  const selected = c.options.find(o => o.id === choice.optionId)
  const image = safeExternalUrl(selected?.item?.image_url)
  const required = isRequired(c)
  const unavailable = availableOptions(c).length === 0
  const off = !required && !choice.included

  return (
    <li className={cn('rounded-xl border border-border bg-surface p-4 transition-opacity', off && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-primary">
            {c.slot_label}
            {c.quantity > 1 && <span className="ml-2 text-sm font-normal text-text-primary/60">× {c.quantity}</span>}
          </h3>
          {c.notes && <p className="mt-1 text-sm text-text-primary/70">{c.notes}</p>}
        </div>
        {required && (
          <span className="font-label inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-primary/40 px-2.5 py-1 text-[10px] tracking-widest text-accent-primary">
            <Check className="h-3 w-3" aria-hidden="true" />
            Included
          </span>
        )}
      </div>

      {unavailable ? (
        <p className="mt-3 text-sm text-text-secondary">Currently unavailable.</p>
      ) : (
        <div className="mt-3 flex gap-3">
          {image ? (
            <img src={image} alt={selected?.item?.name ?? c.slot_label} width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-primary/40" aria-hidden="true">
              <ImageOff className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text-primary">{selected?.item?.name ?? 'To be assigned'}</p>
            {selected?.provider && <p className="truncate text-xs text-text-primary/60">by {selected.provider.name}</p>}
            <p className={cn('mt-1 text-sm font-semibold tabular-nums', TONE[line.tone])}>
              {off ? 'Not included' : line.text}
              {!off && line.detail && <span className="ml-1.5 text-xs font-normal text-text-primary/60">{line.detail}</span>}
            </p>
            {!off && guestFit === false && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                May not suit a group of {groupSize}
              </p>
            )}
          </div>
        </div>
      )}

      {!unavailable && isSwappable(c) && !off && (
        <div className="mt-3">
          <Select value={choice.optionId} onValueChange={onSwap}>
            <SelectTrigger className="w-full data-[size=default]:h-11" aria-label={`Choose an option for ${c.slot_label}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOptions(c).map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {(o.item?.name ?? 'Option')} — {describePricing(o.pricing).text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {canToggle(c) && (
        <label htmlFor={switchId} className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm text-text-primary">{choice.included ? 'Added to your package' : 'Add to your package'}</span>
          <Switch id={switchId} checked={choice.included} onCheckedChange={onToggle} aria-label={`${c.slot_label}: ${choice.included ? 'on' : 'off'}`} />
        </label>
      )}
    </li>
  )
}
