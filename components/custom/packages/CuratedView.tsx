'use client'

import type { Ref } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { includedItems, primaryAction, showCustomizeLink, showItemPrices } from '@/lib/package-curated-view'
import { describeLine } from '@/lib/package-page-format'
import { safeExternalUrl } from '@/lib/safe-url'
import type { LiveDocument, PublicSnapshotItem } from '@/lib/theme-package-public'
import { PackageText } from './PackageText'
import { primaryButtonClass, textButtonClass } from './styles'

interface Props {
  doc: LiveDocument
  /** Server-priced lines by component, used only for packages without pricing terms. */
  linesByComponent: Map<string, PublicSnapshotItem>
  selectionIsCurated: boolean
  headingRef: Ref<HTMLHeadingElement>
  onPrimary: () => void
  onCustomize: () => void
}

const TONE = { price: 'text-accent-primary', free: 'text-accent-secondary', quote: 'text-text-secondary' } as const

export function CuratedView({ doc, linesByComponent, selectionIsCurated, headingRef, onPrimary, onCustomize }: Props) {
  const { meta } = doc
  const cover = safeExternalUrl(meta.cover_image_url)
  const story = safeExternalUrl(meta.magazine_url)
  const items = includedItems(doc)
  const action = primaryAction(doc)
  const pricing = doc.pricing
  const prices = showItemPrices(doc)

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-32 pt-6">
      <header>
        <span className="font-label inline-block rounded-full border border-accent-primary/40 px-3 py-1 text-[11px] tracking-widest text-accent-primary">
          {doc.occasion}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="font-header mt-3 text-4xl font-bold leading-tight text-text-primary outline-none md:text-5xl">
          {meta.title}
        </h1>
        {meta.subtitle && <p className="mt-2 text-lg text-text-primary/80">{meta.subtitle}</p>}
        {prices && meta.price_note && (
          <p className="mt-3 font-[family-name:var(--font-playfair)] text-xl font-bold text-accent-primary">{meta.price_note}</p>
        )}
      </header>

      {cover && (
        // Curator-supplied URLs can be any https host, so a plain <img> (next/image only allows configured hosts).
        <img
          src={cover}
          alt={`${meta.title} cover`}
          width={1200}
          height={800}
          className="max-h-[420px] w-full rounded-2xl object-cover"
        />
      )}

      {(meta.description || story) && (
        <section aria-label="About this package" className="space-y-4">
          {meta.description && <PackageText text={meta.description} />}
          {story && (
            <a
              href={story}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-secondary px-4 text-sm text-accent-secondary transition-colors hover:bg-accent-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
            >
              Read the story
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </section>
      )}

      <section aria-labelledby="included-heading">
        <h2 id="included-heading" className="font-header text-2xl font-bold">What’s included</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-accent-primary">
          {items.map(item => {
            const line = prices ? describeLine(linesByComponent.get(item.componentId), { treatment: 'quote', price: null, pricing_model: null }) : null
            return (
              <li key={item.componentId} className={item.unavailable ? 'text-text-primary/60' : 'text-text-primary'}>
                <span>
                  {item.name}
                  {item.quantity > 1 && ` x ${item.quantity}`}
                  {item.providerName && <span className="text-text-primary/60"> by {item.providerName}</span>}
                </span>
                {item.unavailable && <span className="ml-2 text-sm italic text-text-primary/60">(currently unavailable)</span>}
                {line && !item.unavailable && (
                  <span className={`ml-2 text-sm font-semibold tabular-nums ${TONE[line.tone]}`}>
                    {line.text}
                    {line.detail && <span className="ml-1 text-xs font-normal text-text-primary/60">{line.detail}</span>}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {pricing && (
        <section aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="font-header text-2xl font-bold">Pricing &amp; reservation details</h2>
          {pricing.mode === 'free_text' && pricing.free_text && <PackageText text={pricing.free_text} className="mt-3" />}
          {pricing.lines.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-accent-primary">
              {pricing.lines.map((l, i) => (
                <li key={i} className={i === 0 ? 'text-lg font-semibold text-text-primary' : 'text-text-primary/80'}>{l}</li>
              ))}
            </ul>
          )}
          {pricing.notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-primary/70 marker:text-text-primary/40">
              {pricing.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </section>
      )}

      {!doc.requestable && (
        <p role="status" className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary/80">
          This package can’t be requested right now because part of it is unavailable.
        </p>
      )}
      {doc.requestable && action.kind === 'unavailable' && (
        <p role="status" className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary/80">
          An item in this experience is currently unavailable, so it can’t be reserved right now.
        </p>
      )}

      <section aria-label="Next step" className="flex flex-col items-start gap-2">
        <Button type="button" className={primaryButtonClass} disabled={action.disabled} onClick={onPrimary}>
          {action.label}
        </Button>
        {action.sublabel && <p className="text-sm text-text-primary/70">{action.sublabel}</p>}
        {showCustomizeLink(doc) && (
          <button type="button" className={textButtonClass} onClick={onCustomize}>
            Customize this experience
          </button>
        )}
        {showCustomizeLink(doc) && !selectionIsCurated && (
          <p className="text-sm text-text-primary/70">
            Your customizations are saved. Reserving books the package as curated; to include them, request a quote.
          </p>
        )}
      </section>
    </div>
  )
}
