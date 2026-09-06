interface VibeShareCardTag {
  slug: string
  label: string
  emoji: string
}

interface VibeShareCardEvent {
  id: string
  name: string
  venue_name: string | null
  event_date: string
  flyer_image_url: string | null
}

interface VibeShareCardProps {
  tags: VibeShareCardTag[]
  caption: string
  matchedEvents: VibeShareCardEvent[]
}

// Purely presentational — no fetching, no state. Square (1:1) at 360px on-screen;
// the capture step (VibeTagPickerDialog) applies pixelRatio during html-to-image
// export to land near a ~1080px output image.
export default function VibeShareCard({ tags, caption, matchedEvents }: VibeShareCardProps) {
  return (
    <div className="aspect-square w-[360px] flex flex-col justify-between bg-surface border border-border rounded-2xl p-5 overflow-hidden">
      <div className="flex flex-col items-center gap-3">
        {/* Branding — same wordmark treatment as top-bar.tsx's site logo */}
        <div className="text-sm font-bold text-accent-primary tracking-wide">RTNY</div>

        {/* Headline — same text treatment as VibePulseModule's idle-state heading */}
        <span className="font-header font-bold uppercase leading-[1.05] text-2xl text-text-primary text-center">
          What&apos;s the Vibe?
        </span>

        {/* Tag chips — same border/fill treatment as VibeTagPickerDialog's tag
            grid tiles, compacted into a row for card display */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.slug}
              className="inline-flex items-center gap-1 rounded-full border-2 border-accent-secondary bg-accent-secondary/10 px-2.5 py-1"
            >
              <span className="text-sm leading-none">{tag.emoji}</span>
              <span className="font-sans text-xs font-semibold text-text-primary leading-tight">
                {tag.label}
              </span>
            </span>
          ))}
        </div>

        {/* Caption */}
        <p className="font-sans text-sm text-text-primary text-center leading-relaxed line-clamp-4 px-1">
          {caption}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {/* Matches Tonight — omitted entirely when empty, not shown as an
            empty state, since this renders on a card meant to be shared publicly */}
        {matchedEvents.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <p className="font-label text-[10px] uppercase tracking-widest text-accent-secondary text-center">
              Matches Tonight
            </p>
            <div className="flex flex-col gap-0.5">
              {matchedEvents.map((event) => (
                <p key={event.id} className="text-[11px] text-text-secondary text-center truncate">
                  {event.name}
                  {event.venue_name ? ` · ${event.venue_name}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <p className="text-[10px] text-text-secondary/50 text-center tracking-wide">
          Discover your vibe on RTNY · ROCTICKETNY.COM
        </p>
      </div>
    </div>
  )
}
