'use client'

import { EventCardWeek, EventRowWeek, type WeekEvent } from './event-card-week'
import { ArrowRight } from 'lucide-react'

interface DayGroup {
  label: string
  events: WeekEvent[]
}

const eventsData: DayGroup[] = [
  {
    label: 'TONIGHT',
    events: [
      {
        id: '1',
        name: 'Jazz Night at Montage Music Hall',
        venue: 'Montage Music Hall',
        time: '8PM',
        price: '$15',
        category: 'Music',
        imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=600&fit=crop',
        description: "Rochester's favorite jazz night with live performances and craft cocktails",
      },
      {
        id: '2',
        name: 'Ladies Night at Club Bliss',
        venue: 'Club Bliss',
        time: '9PM',
        price: 'Free',
        category: 'Nightlife',
        imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=600&fit=crop',
        description: 'Free entry for ladies all night with drink specials and live DJ',
      },
      {
        id: '3',
        name: 'Trivia Night at Ox & Stone',
        venue: 'Ox & Stone',
        time: '7PM',
        price: 'Free',
        category: 'Food',
        imageUrl: 'https://images.unsplash.com/photo-1546805022-56ce3cd3d2cd?w=400&h=600&fit=crop',
        description: 'Test your knowledge over great food and cold drinks with cash prizes',
      },
      {
        id: '4',
        name: 'Open Mic at Bug Jar',
        venue: 'Bug Jar',
        time: '8PM',
        price: '$5',
        category: 'Music',
        imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop',
        description: "Local artists take the stage in Rochester's most beloved indie venue",
      },
    ],
  },
  {
    label: 'TOMORROW',
    events: [
      {
        id: '5',
        name: 'Family Movie Night at Strong Museum',
        venue: 'Strong Museum',
        time: '6PM',
        price: '$12',
        category: 'Family',
        imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
        description: 'Outdoor movie screening with popcorn, games and family activities',
      },
      {
        id: '6',
        name: 'Latin Night at Club XO',
        venue: 'Club XO',
        time: '10PM',
        price: '$20',
        category: 'Nightlife',
        imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=600&fit=crop',
        description: "The hottest Latin rhythms with Rochester's best DJs and dancers",
      },
      {
        id: '7',
        name: 'Brunch at The Revelry',
        venue: 'The Revelry',
        time: '11AM',
        price: '$25',
        category: 'Food',
        imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=600&fit=crop',
        description: 'Bottomless mimosas and elevated brunch bites in a stunning setting',
      },
      {
        id: '8',
        name: 'Art Show at Rochester Contemporary',
        venue: 'Rochester Contemporary',
        time: '5PM',
        price: 'Free',
        category: 'Arts',
        imageUrl: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=600&fit=crop',
        description: 'Local and regional artists showcase new work in a free gallery opening',
      },
    ],
  },
  {
    label: 'THIS WEEKEND',
    events: [
      {
        id: '9',
        name: 'Rochester Music Festival',
        venue: 'Downtown Rochester',
        time: '2PM',
        price: '$35',
        category: 'Music',
        imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop',
        description: "Three stages, 20+ artists, and Rochester's biggest outdoor music celebration",
      },
      {
        id: '10',
        name: 'Kids Craft Day at Lego Store',
        venue: 'Lego Store',
        time: '1PM',
        price: 'Free',
        category: 'Family',
        imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=600&fit=crop',
        description: 'Free drop-in creative building sessions for kids of all ages',
      },
      {
        id: '11',
        name: 'Comedy Night at Funny Bone',
        venue: 'Funny Bone',
        time: '8PM',
        price: '$25',
        category: 'Arts',
        imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=600&fit=crop',
        description: 'Top national touring comedians bring the laughs to Rochester',
      },
      {
        id: '12',
        name: 'Dinner Jazz at Tala',
        venue: 'Tala',
        time: '7PM',
        price: '$45',
        category: 'Food',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=600&fit=crop',
        description: 'An intimate fine dining experience with live jazz and seasonal cuisine',
      },
    ],
  },
]

function DayHeader({ label }: { label: string }) {
  return (
    <div className="py-3 flex justify-center">
      <h3 className="font-slab-serif text-2xl font-bold text-[#F9FDFF]">
        {label}
      </h3>
    </div>
  )
}

export function ThisWeekRochester() {
  return (
    <section className="w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-slab-serif font-bold text-xl md:text-2xl text-[#F9FDFF] flex items-center gap-2">
          <span>📅</span>
          <span>This Week in Rochester</span>
        </h2>
        <button
          type="button"
          className="font-label text-sm font-medium text-[#59FFA0] flex items-center gap-1"
        >
          See All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-6 md:gap-8">
        {eventsData.map((dayGroup) => (
          <div key={dayGroup.label} className="flex flex-col gap-3">
            <DayHeader label={dayGroup.label} />
            <div className="h-px bg-white/[0.06]" />

            {/* Mobile: 2-column grid */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {dayGroup.events.map((event) => (
                <EventCardWeek key={event.id} event={event} />
              ))}
            </div>

            {/* Desktop: horizontal list rows */}
            <div className="hidden md:flex md:flex-col">
              {dayGroup.events.map((event) => (
                <EventRowWeek key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
