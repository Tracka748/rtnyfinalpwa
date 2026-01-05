"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface AnnouncementStripProps {
  icon?: string
  title: string
  subtitle: string
  highlight: string
  ctaText: string
  ctaLink: string
  onDismiss?: () => void
}

export function AnnouncementStrip({
  icon,
  title,
  subtitle,
  highlight,
  ctaText,
  ctaLink,
  onDismiss,
}: AnnouncementStripProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-4">
      <div className="relative rounded-xl border-l-4 border-accent-secondary bg-surface-elevated p-4">
        <div className="flex items-center gap-4">
          {/* Optional icon/graphic */}
          {icon && (
            <div className="hidden sm:flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-surface text-4xl">
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-bold text-text-primary sm:text-lg">{title}</h3>
            <p className="text-sm text-text-secondary">{subtitle}</p>
            <p className="mt-1 text-sm font-medium text-accent-primary">{highlight}</p>
          </div>

          {/* CTA */}
          <Button size="sm" className="shrink-0 bg-accent-primary text-background hover:bg-accent-primary/90">
            <span className="hidden sm:inline">{ctaText}</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>

          {/* Optional dismiss */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute right-2 top-2 text-text-muted hover:text-text-primary"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
