import { EventCard } from '@/components/custom/events/event-card'

interface GroupEventsListProps {
  events: any[]
  groupName: string
  accentColor?: string
}

export default function GroupEventsList({ events, groupName, accentColor = '#59FFA0' }: GroupEventsListProps) {
  return (
    <div>
      <h2
        className="font-slab-serif font-bold text-4xl text-[#F9FDFF] mb-8 pl-4"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Exclusive {groupName} Events
      </h2>

      {events.length === 0 ? (
        <p className="text-center text-[#A0A0A0] font-sans py-10 text-sm">
          No exclusive events right now. Stay tuned.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <div key={event.id} className="relative">
              <MembersOnlyBadge accentColor={accentColor} />
              <EventCard event={event} />
            </div>
          ))}
        </div>
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
