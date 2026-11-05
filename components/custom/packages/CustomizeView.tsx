'use client'

import type { Ref } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ComponentCard } from './ComponentCard'
import { GuestCountControl } from './GuestCountControl'
import { textButtonClass } from './styles'
import { describeLine } from '@/lib/package-page-format'
import { selectedOption, type SelectionState } from '@/lib/package-selection'
import type { LiveDocument, PublicSnapshotItem } from '@/lib/theme-package-public'

interface Props {
  doc: LiveDocument
  selection: SelectionState
  guests: number
  linesByComponent: Map<string, PublicSnapshotItem>
  headingRef: Ref<HTMLHeadingElement>
  /** When false the page has no curated view to go back to (packages without pricing terms). */
  canGoBack: boolean
  onBack: () => void
  onGuestsChange: (n: number) => void
  onToggle: (componentId: string) => void
  onSwap: (componentId: string, optionId: string) => void
}

/** The configurator: guest control and one card per component. Behaviour is unchanged from the previous page. */
export function CustomizeView({ doc, selection, guests, linesByComponent, headingRef, canGoBack, onBack, onGuestsChange, onToggle, onSwap }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-32 pt-6">
      {canGoBack && (
        <button type="button" className={`${textButtonClass} -ml-4 gap-2`} onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the experience
        </button>
      )}
      <header>
        <p className="font-label text-[11px] tracking-widest text-accent-primary">{doc.occasion}</p>
        <h1 ref={headingRef} tabIndex={-1} className="font-header mt-1 text-3xl font-bold text-text-primary outline-none">
          Customize {doc.meta.title}
        </h1>
      </header>

      <GuestCountControl value={guests} min={doc.meta.min_guests} max={doc.meta.max_guests} onChange={onGuestsChange} />

      <h2 className="font-header pt-2 text-2xl font-bold">What’s included</h2>
      <ul className="space-y-3">
        {doc.components.map(c => {
          const choice = selection[c.id]
          if (!choice) return null
          const opt = selectedOption(doc, selection, c.id)
          const item = linesByComponent.get(c.id)
          return (
            <ComponentCard
              key={c.id}
              component={c}
              choice={choice}
              line={describeLine(item, opt?.pricing ?? { treatment: 'quote', price: null, pricing_model: null })}
              guestFit={item?.guest_fit ?? null}
              groupSize={guests}
              onToggle={() => onToggle(c.id)}
              onSwap={optionId => onSwap(c.id, optionId)}
            />
          )
        })}
      </ul>
    </div>
  )
}
