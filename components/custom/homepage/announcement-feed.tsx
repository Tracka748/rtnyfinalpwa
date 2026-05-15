'use client'

import { Megaphone, Award, Tag } from 'lucide-react'

type CardType = 'announcement' | 'curated' | 'deal' | 'featured'

interface FeedCard {
  id: number
  type: CardType
  headline: string
  sub: string
  action: string
  imageId?: number
}

const TYPE_COLOR: Record<CardType, string> = {
  announcement: '#59FFA0',
  curated: '#1AC8ED',
  deal: '#EF9F27',
  featured: '#7F77DD',
}

const TYPE_LABEL: Record<CardType, string> = {
  announcement: 'Announcement',
  curated: 'Curated',
  deal: 'Deal',
  featured: 'Featured',
}

const CARDS: FeedCard[] = [
  { id: 1, type: 'announcement', headline: 'Crews Are Live 🎉', sub: 'Plan your night with your squad. Invite friends, unlock perks.', action: 'Explore Crews →' },
  { id: 2, type: 'curated', headline: 'Staff Pick: Jazz Night', sub: 'Old Toad is the spot this Friday. Smooth vibes guaranteed.', action: 'Get Tickets →' },
  { id: 3, type: 'deal', headline: 'Free Before 10PM', sub: 'Skip the cover at Club Bliss tonight. First 50 through the door.', action: 'Claim Deal →' },
  { id: 4, type: 'featured', headline: 'Featured: DJ Xtreme', sub: 'Rochester\'s top DJ returns to Anthology this Saturday.', action: 'View Profile →', imageId: 10 },
  { id: 5, type: 'announcement', headline: 'RTNY Rewards Launched', sub: 'Earn points every time you buy, share or check in.', action: 'Learn More →' },
  { id: 6, type: 'deal', headline: '2-for-1 Tickets', sub: 'This weekend only at Montage Music Hall. Limited pairs left.', action: 'Get Tickets →' },
  { id: 7, type: 'curated', headline: 'Hidden Gem: The Bop Shop', sub: 'Park Ave\'s best kept secret. Open mic every Thursday.', action: 'Explore →' },
  { id: 8, type: 'featured', headline: 'Venue Spotlight: Anthology', sub: 'Rochester\'s premier live music venue. 4 shows this week.', action: 'View Venue →', imageId: 42 },
]

function TypeIcon({ type }: { type: CardType }) {
  const color = TYPE_COLOR[type]
  const size = 24
  if (type === 'announcement') return <Megaphone size={size} color={color} strokeWidth={1.5} />
  if (type === 'curated') return <Award size={size} color={color} strokeWidth={1.5} />
  if (type === 'deal') return <Tag size={size} color={color} strokeWidth={1.5} />
  return null
}

function FeedCardItem({ card }: { card: FeedCard }) {
  const color = TYPE_COLOR[card.type]
  const label = TYPE_LABEL[card.type]

  const iconBg = `${color}1F` // ~12% opacity hex approximation

  return (
    <div
      style={{
        width: '280px',
        flexShrink: 0,
        background: '#111318',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Orb */}
      <div
        style={{
          position: 'absolute',
          left: '-10px',
          top: '-10px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          opacity: 0.15,
          filter: 'blur(20px)',
          background: color,
          pointerEvents: 'none',
        }}
      />

      {/* Left icon / image */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '10px',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: iconBg,
        }}
      >
        {card.type === 'featured' ? (
          <img
            src={`https://picsum.photos/60/60?random=${card.imageId}`}
            alt={card.headline}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: '10px', width: '60px', height: '60px' }}
          />
        ) : (
          <TypeIcon type={card.type} />
        )}
      </div>

      {/* Right text */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color,
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#F9FDFF',
            lineHeight: 1.3,
          }}
        >
          {card.headline}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: '#888',
            marginTop: '3px',
            lineHeight: 1.4,
          }}
        >
          {card.sub}
        </span>
        <span
          style={{
            marginTop: '8px',
            fontSize: '11px',
            fontWeight: 500,
            padding: '4px 12px',
            borderRadius: '20px',
            border: `0.5px solid ${color}`,
            display: 'inline-block',
            color,
            background: 'transparent',
            alignSelf: 'flex-start',
            cursor: 'pointer',
          }}
        >
          {card.action}
        </span>
      </div>
    </div>
  )
}

export function AnnouncementFeed() {
  return (
    <section style={{ paddingTop: '16px', paddingBottom: '4px' }}>
      <p
        className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3"
        style={{ paddingLeft: '16px' }}
      >
        What&apos;s Happening
      </p>
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '12px',
          padding: '0 16px 12px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {CARDS.map((card) => (
          <FeedCardItem key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}
