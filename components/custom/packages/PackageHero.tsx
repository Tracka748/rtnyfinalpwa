import { ExternalLink, Users } from 'lucide-react'
import { guestRangeLabel } from '@/lib/package-page-format'
import { safeExternalUrl } from '@/lib/safe-url'
import type { LiveDocument } from '@/lib/theme-package-public'

export function PackageHero({ doc }: { doc: LiveDocument }) {
  const { meta } = doc
  const guests = guestRangeLabel(meta.min_guests, meta.max_guests)
  const cover = safeExternalUrl(meta.cover_image_url)
  const story = safeExternalUrl(meta.magazine_url)

  return (
    <header>
      <div className="relative isolate flex min-h-[420px] items-end overflow-hidden md:min-h-[480px]">
        {cover ? (
          <img src={cover} alt={`${meta.title} cover`} width={1200} height={800} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 -z-20 bg-gradient-to-br from-purple-900/40 to-pink-900/20" aria-hidden="true" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-black/30" aria-hidden="true" />

        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-24">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-label rounded-full border border-accent-primary/40 bg-black/40 px-3 py-1 text-[11px] tracking-widest text-accent-primary backdrop-blur-sm">
              {doc.occasion}
            </span>
            {guests && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-text-primary backdrop-blur-sm">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {guests}
              </span>
            )}
          </div>
          <h1 className="font-header text-4xl font-bold leading-tight text-text-primary md:text-5xl">{meta.title}</h1>
          {meta.subtitle && <p className="mt-2 text-lg text-text-primary/80">{meta.subtitle}</p>}
          {meta.price_note && (
            <p className="mt-3 font-[family-name:var(--font-playfair)] text-xl font-bold text-accent-primary">{meta.price_note}</p>
          )}
          {story && (
            <a
              href={story}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-secondary px-4 text-sm text-accent-secondary transition-colors hover:bg-accent-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
            >
              Read the story
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>

      {meta.description && (
        <section className="mx-auto max-w-3xl px-4 pt-6" aria-label="About this package">
          <p className="whitespace-pre-line leading-relaxed text-text-primary/80">{meta.description}</p>
        </section>
      )}
    </header>
  )
}
