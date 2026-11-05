import { toParagraphs } from '@/lib/package-curated-view'
import { cn } from '@/lib/utils'

/**
 * Package description text: plain paragraphs with line breaks kept. This is the one place text is
 * rendered, so @alias links can be added here later without touching the page.
 */
export function PackageText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {toParagraphs(text).map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed text-text-primary/80">
          {paragraph}
        </p>
      ))}
    </div>
  )
}
