'use client'

import { useState } from 'react'
import { EventCardWeek, EventRowWeek, type WeekEvent, type EventCategory, type EventDay } from './event-card-week'
import { ArrowRight } from 'lucide-react'

const allEvents: WeekEvent[] = [
  // CONCERTS — tonight
  {
    id: 'c1',
    name: 'Jazz Night at Montage Music Hall',
    venue: 'Montage Music Hall',
    time: '8:00 PM',
    price: '$15',
    category: 'Music',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=600&fit=crop',
    description: "Rochester's favorite jazz night with live performances and craft cocktails",
  },
  {
    id: 'c2',
    name: 'Open Mic at Bug Jar',
    venue: 'Bug Jar',
    time: '8:00 PM',
    price: '$5',
    category: 'Music',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop',
    description: "Local artists take the stage in Rochester's most beloved indie venue",
  },
  // CONCERTS — tomorrow
  {
    id: 'c3',
    name: 'Indie Rock Night at Water Street',
    venue: 'Water Street Music Hall',
    time: '7:30 PM',
    price: '$20',
    category: 'Music',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1598387993441-a364f854ccd6?w=400&h=600&fit=crop',
    description: 'Four rising indie acts light up the Water Street stage on a Friday night',
  },
  {
    id: 'c4',
    name: 'Blues Brothers Tribute at Anthology',
    venue: 'Anthology',
    time: '9:00 PM',
    price: '$18',
    category: 'Music',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop',
    description: 'The ultimate Blues Brothers experience — horns, soul and showmanship',
  },
  // CONCERTS — weekend
  {
    id: 'c5',
    name: 'Rochester Music Festival',
    venue: 'Downtown Rochester',
    time: '2:00 PM',
    price: '$35',
    category: 'Music',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=600&fit=crop',
    description: "Three stages, 20+ artists, and Rochester's biggest outdoor music celebration",
  },
  {
    id: 'c6',
    name: 'Singer-Songwriter Showcase',
    venue: 'Photo City Music Hall',
    time: '7:00 PM',
    price: '$12',
    category: 'Music',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=400&h=600&fit=crop',
    description: 'Six local songwriters share new originals in an intimate acoustic set',
  },
  // BARS / CLUBS — tonight
  {
    id: 'b1',
    name: 'Ladies Night at Club Bliss',
    venue: 'Club Bliss',
    time: '9:00 PM',
    price: 'Free',
    category: 'Nightlife',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=600&fit=crop',
    description: 'Free entry for ladies all night with drink specials and live DJ',
  },
  {
    id: 'b2',
    name: 'DJ Krave at Aperture',
    venue: 'Aperture',
    time: '10:00 PM',
    price: '$10',
    category: 'Nightlife',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1574786527860-f2e274867c91?w=400&h=600&fit=crop',
    description: 'Rochester\'s top DJ spinning hip-hop, R&B and afrobeats all night long',
  },
  // BARS / CLUBS — tomorrow
  {
    id: 'b3',
    name: 'Latin Night at Club XO',
    venue: 'Club XO',
    time: '10:00 PM',
    price: '$20',
    category: 'Nightlife',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=600&fit=crop',
    description: "The hottest Latin rhythms with Rochester's best DJs and dancers",
  },
  {
    id: 'b4',
    name: 'Rooftop Happy Hour at The Ave',
    venue: 'The Avenue Pub',
    time: '6:00 PM',
    price: 'Free',
    category: 'Nightlife',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=600&fit=crop',
    description: 'Skyline views, craft cocktails and live acoustic sets every Friday evening',
  },
  // BARS / CLUBS — weekend
  {
    id: 'b5',
    name: 'Warehouse Party at Flour City Station',
    venue: 'Flour City Station',
    time: '10:00 PM',
    price: '$25',
    category: 'Nightlife',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop',
    description: 'Industrial vibes, house music and a full bar inside a historic flour mill',
  },
  {
    id: 'b6',
    name: 'Late Night Lounge at Boulder Coffee',
    venue: 'Boulder Coffee Co.',
    time: '9:00 PM',
    price: 'Free',
    category: 'Nightlife',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop',
    description: 'Chill late-night vibes with rotating DJs and specialty cocktail drinks',
  },
  // MOVIES — tonight
  {
    id: 'm1',
    name: 'The Fantastic Four: First Steps',
    venue: 'Regal Henrietta',
    time: '7:30 PM',
    price: '$14',
    category: 'Family',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
    description: "Marvel's first family returns in a stunning retro-futuristic adventure",
  },
  {
    id: 'm2',
    name: 'How to Train Your Dragon',
    venue: 'AMC Greece Ridge',
    time: '8:00 PM',
    price: '$13',
    category: 'Family',
    day: 'tonight',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    description: 'The beloved animated classic gets a stunning live-action reimagining',
  },
  // MOVIES — tomorrow
  {
    id: 'm3',
    name: 'The Minecraft Movie',
    venue: 'Regal Eastview',
    time: '7:00 PM',
    price: '$15',
    category: 'Family',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop',
    description: 'Steve and his crew save the Overworld in the big-screen video-game event',
  },
  {
    id: 'm4',
    name: 'Paddington in Peru',
    venue: 'The Little Theatre',
    time: '5:30 PM',
    price: '$12',
    category: 'Family',
    day: 'tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=400&h=600&fit=crop',
    description: 'Everyone\'s favorite bear heads to Peru in this warm and funny family film',
  },
  // MOVIES — weekend
  {
    id: 'm5',
    name: 'Inside Out 2 — Throwback Screening',
    venue: 'The Little Theatre',
    time: '2:00 PM',
    price: '$10',
    category: 'Family',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop',
    description: 'Bring the whole family for a return trip to Riley\'s emotional world',
  },
  {
    id: 'm6',
    name: 'Lilo & Stitch',
    venue: 'AMC Webster',
    time: '4:30 PM',
    price: '$14',
    category: 'Family',
    day: 'weekend',
    imageUrl: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=400&h=600&fit=crop',
    description: "Disney's beloved alien-dog story comes to life in a live-action remake",
  },
]

type CategoryTab = { label: string; value: EventCategory }
type TimeTab = { label: string; value: EventDay }

const categoryTabs: CategoryTab[] = [
  { label: 'CONCERTS', value: 'Music' },
  { label: 'BARS / CLUBS', value: 'Nightlife' },
  { label: 'MOVIES', value: 'Family' },
]

const timeTabs: TimeTab[] = [
  { label: 'TONIGHT', value: 'tonight' },
  { label: 'TOMORROW', value: 'tomorrow' },
  { label: 'THIS WEEKEND', value: 'weekend' },
]

const inactiveTab =
  'flex-1 py-2 rounded-[8px] text-[11px] uppercase tracking-[0.06em] font-label font-semibold text-[#888] bg-[#1a1a1f] border border-white/[0.12] transition-colors'
const activeTab =
  'flex-1 py-2 rounded-[8px] text-[11px] uppercase tracking-[0.06em] font-label font-semibold text-[#59FFA0] bg-[#1a1a1f] border border-[#59FFA0] transition-colors'

export function ThisWeekRochester() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>('Music')
  const [activeDay, setActiveDay] = useState<EventDay>('tonight')

  const filtered = allEvents.filter(
    (e) => e.category === activeCategory && e.day === activeDay,
  )

  return (
    <section className="w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
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

      {/* Row 1 — Category tabs */}
      <div className="flex gap-2 mb-3">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeCategory === tab.value ? activeTab : inactiveTab}
            onClick={() => setActiveCategory(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Row 2 — Time tabs */}
      <div className="flex gap-2 mb-3">
        {timeTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeDay === tab.value ? activeTab : inactiveTab}
            onClick={() => setActiveDay(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#888] font-label text-sm py-10">
          No events found
        </p>
      ) : (
        <>
          {/* Mobile: 2-column grid */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filtered.map((event) => (
              <EventCardWeek key={event.id} event={event} />
            ))}
          </div>

          {/* Desktop: horizontal list rows */}
          <div className="hidden md:flex md:flex-col">
            {filtered.map((event) => (
              <EventRowWeek key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
