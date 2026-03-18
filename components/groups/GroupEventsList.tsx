import { EventCard } from '@/components/custom/events/event-card'

interface GroupEventsListProps {
  events: any[]
  groupName: string
  accentColor?: string
}

export function GroupEventsList({ events, groupName, accentColor = '#59FFA0' }: GroupEventsListProps) {
  return (
    <div>
      <h2 className="font-header font-bold text-xl text-[#F9FDFF] mb-4">
        Exclusive {groupName} Events
      </h2>

      {events.length === 0 ? (
        <p className="text-center text-[#A0A0A0] font-sans py-10 text-sm">
          No exclusive events right now. Stay tuned.
        </p>
      ) : (
        <>
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-4 overflow-x-auto pb-2 md:hidden scrollbar-hide">
            {events.map(event => (
              <div key={event.id} className="relative shrink-0 w-52">
                <MembersOnlyBadge accentColor={accentColor} />
                <EventCard event={event} />
              </div>
            ))}
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <div key={event.id} className="relative">
                <MembersOnlyBadge accentColor={accentColor} />
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MembersOnlyBadge({ accentColor }: { accentColor: string }) {
  return (
    <div className="absolute top-2 left-2 z-10">
      <span
        className="font-label text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full text-[#121113]"
        style={{ backgroundColor: accentColor }}
      >
        Members Only
      </span>
    </div>
  )
}
