import type { Event } from "@/lib/homepage/types"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface FeaturedEventsProps {
  events: Event[]
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const getCategoryColor = (category: Event["category"]) => {
    const colors = {
      movies: "bg-blue-500/20 text-blue-400",
      nightlife: "bg-badge-nightlife/20 text-badge-nightlife",
      family: "bg-badge-family/20 text-badge-family",
      music: "bg-accent-tertiary/20 text-accent-tertiary",
      dining: "bg-orange-500/20 text-orange-400",
      arts: "bg-pink-500/20 text-pink-400",
      sports: "bg-green-500/20 text-green-400",
      festivals: "bg-yellow-500/20 text-yellow-400",
    }
    return colors[category] || colors.movies
  }

  const getCategoryIcon = (category: Event["category"]) => {
    const icons = {
      movies: "🎬",
      nightlife: "🎉",
      family: "👨‍👩‍👧",
      music: "🎸",
      dining: "🍹",
      arts: "🎨",
      sports: "🏃",
      festivals: "✨",
    }
    return icons[category] || "🎉"
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Popular in Rochester</h2>
        <Button variant="ghost" size="sm" className="text-accent-primary hover:text-accent-primary/80">
          See All
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group shrink-0 w-[220px] cursor-pointer overflow-hidden rounded-xl bg-surface transition-all hover:bg-surface-elevated md:w-[260px]"
          >
            <div className="relative h-[120px] overflow-hidden md:h-[140px]">
              <img
                src={event.image || "/placeholder.svg"}
                alt={event.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div
                className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(event.category)}`}
              >
                {getCategoryIcon(event.category)} {event.category}
              </div>
            </div>
            <div className="p-3">
              <h3 className="mb-1 line-clamp-2 text-sm font-bold text-text-primary">{event.title}</h3>
              <p className="mb-2 text-xs text-text-secondary">
                {event.time} • {event.venue}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{event.price}</span>
                <span className="rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-semibold text-accent-primary">
                  +{event.points}pts
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
