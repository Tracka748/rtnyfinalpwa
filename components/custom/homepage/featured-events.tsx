import type { Event } from "@/lib/homepage/types"
import { ChevronRight, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Popular in Rochester</h2>
        <Button variant="ghost" size="sm" className="text-accent-primary hover:text-accent-primary/80">
          See All
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group shrink-0 w-[280px] cursor-pointer overflow-hidden rounded-2xl bg-[#1A1A1A] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(89,255,160,0.15)] md:w-[300px]"
          >
            {/* Image Container with Gradient Overlay */}
            <div className="relative h-[160px] overflow-hidden md:h-[180px]">
              <img
                src={getEventImage(event.image, event.category)}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_EVENT_IMAGE
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(26,26,26,0) 0%, rgba(26,26,26,0.3) 60%, rgba(26,26,26,1) 100%)",
                }}
              />
              {/* Category Badge */}
              <div
                className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md ${getCategoryColor(event.category)}`}
              >
                {getCategoryIcon(event.category)} {event.category}
              </div>
              {/* Featured Badge */}
              <div className="absolute right-3 top-3 rounded-full bg-[#59FFA0]/20 px-3 py-1 backdrop-blur-md">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#59FFA0]">
                  Featured
                </span>
              </div>
            </div>

            {/* Content Container */}
            <div className="p-4">
              <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight text-[#F9FDFF] transition-colors duration-300 group-hover:text-[#59FFA0]">
                {event.title}
              </h3>

              {/* Time & Venue */}
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[#E0E0E0]">
                  <Calendar className="h-3.5 w-3.5 text-[#59FFA0]" />
                  <span className="text-sm">{event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-[#E0E0E0]">
                  <MapPin className="h-3.5 w-3.5 text-[#1AC8ED]" />
                  <span className="text-sm">{event.venue}</span>
                </div>
              </div>

              {/* Price & Points */}
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-base font-semibold text-[#59FFA0]">{event.price}</span>
                <span className="rounded-full bg-[#59FFA0]/20 px-2.5 py-1 text-xs font-semibold text-[#59FFA0]">
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
