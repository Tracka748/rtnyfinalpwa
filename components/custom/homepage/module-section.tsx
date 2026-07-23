'use client'

import { EventCard } from "@/components/custom/homepage/event-card"
import type { Module } from "@/lib/homepage/types"
import { ArrowRight } from "lucide-react"
import { useSavedEvents } from "@/hooks/useSavedEvents"

interface ModuleSectionProps {
  module: Module
}

export function ModuleSection({ module }: ModuleSectionProps) {
  const { isSaved, toggleSave } = useSavedEvents()

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">
          {module.icon} {module.title.toUpperCase()}
        </h2>
        <a
          href={`/events?category=${module.id}`}
          className="flex items-center gap-1 text-sm text-accent-secondary hover:text-accent-primary transition-colors"
        >
          See All
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {module.events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            size="medium"
            isSaved={isSaved(event.id)}
            onToggleSave={() => toggleSave(event.id)}
          />
        ))}
      </div>
    </section>
  )
}
