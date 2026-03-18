import type { Module } from "@/lib/homepage/types"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

interface ModuleCardProps {
  module: Module
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h3 className="text-base font-bold text-text-primary">{module.title}</h3>
      </div>

      {/* Event rows */}
      <div className="divide-y divide-border">
        {module.events.slice(0, 3).map((event) => (
          <div key={event.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-elevated">
            <img
              src={getEventImage(event.image, event.category)}
              alt={event.title}
              className="h-[60px] w-[60px] shrink-0 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_EVENT_IMAGE
              }}
            />
            <div className="min-w-0 flex-1">
              <h4 className="mb-0.5 truncate text-sm font-semibold text-text-primary">{event.title}</h4>
              <p className="mb-1 text-xs text-text-secondary">{event.venue}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary">{event.time}</span>
                <span className="text-text-secondary">•</span>
                <span className="font-medium text-text-primary">{event.price}</span>
                <span className="text-text-secondary">•</span>
                <span className="font-semibold text-accent-primary">+{event.points}pts</span>
              </div>
            </div>
            <Button size="sm" className="shrink-0 bg-accent-primary text-background hover:bg-accent-primary/90">
              Buy
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button variant="ghost" className="w-full text-accent-secondary hover:text-accent-secondary/80">
          See All
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
