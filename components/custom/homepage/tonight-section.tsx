import { EventCard } from "@/components/custom/homepage/event-card"
import type { Event } from "@/lib/homepage/types"
import { ArrowRight } from "lucide-react"

interface TonightSectionProps {
  events: Event[]
  deals: Event[]
}

export function TonightSection({ events, deals }: TonightSectionProps) {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-8 space-y-8">
      {/* Events Row */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">🌙 TONIGHT IN ROCHESTER</h2>
          <a
            href="/tonight"
            className="flex items-center gap-1 text-sm text-accent-secondary hover:text-accent-primary transition-colors"
          >
            See All
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {events.length === 0 ? (
            <div className="w-full text-center py-8 text-text-secondary">
              No events found for tonight. Check back soon! 🎉
            </div>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} size="medium" />
            ))
          )}
        </div>
      </div>

      {/* Deals Row */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">DEALS & PROMOS</h2>
          <a
            href="/deals"
            className="flex items-center gap-1 text-sm text-accent-secondary hover:text-accent-primary transition-colors"
          >
            See All
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {deals.length === 0 ? (
            <div className="w-full text-center py-8 text-text-secondary">
              No deals available tonight. Check back soon!
            </div>
          ) : (
            deals.map((deal) => (
              <EventCard key={deal.id} event={deal} size="medium" />
            ))
          )}
        </div>
      </div>
    </section>
  )
}
