'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Award, Tag, Copy, Check, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type CardType = 'announcement' | 'curated' | 'deal' | 'featured'

interface FeedCard {
  id: string
  type: CardType
  headline: string
  sub: string
  action: string
  image_url?: string
  cta_url?: string
  event_id?: string
  promo_code?: string
}

// Shape returned by GET /api/v1/feed-cards
interface ApiFeedCard {
  id: string
  type: CardType
  headline: string
  sub: string | null
  action_label: string | null
  cta_url: string | null
  event_id: string | null
  promo_code: string | null
  image_url: string | null
}

function mapApiCard(api: ApiFeedCard): FeedCard {
  return {
    id: api.id,
    type: api.type,
    headline: api.headline,
    sub: api.sub ?? '',
    action: api.action_label ?? '',
    image_url: api.image_url ?? undefined,
    cta_url: api.cta_url ?? undefined,
    event_id: api.event_id ?? undefined,
    promo_code: api.promo_code ?? undefined,
  }
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

function TypeIcon({ type }: { type: CardType }) {
  const color = TYPE_COLOR[type]
  const size = 24
  if (type === 'announcement') return <Megaphone size={size} color={color} strokeWidth={1.5} />
  if (type === 'curated') return <Award size={size} color={color} strokeWidth={1.5} />
  if (type === 'deal') return <Tag size={size} color={color} strokeWidth={1.5} />
  return null
}

function DealModal({
  card,
  open,
  onClose,
}: {
  card: FeedCard
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!card.promo_code) return
    navigator.clipboard.writeText(card.promo_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewEvent = () => {
    onClose()
    router.push(`/events/${card.event_id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Tag size={14} color={TYPE_COLOR.deal} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: TYPE_COLOR.deal, fontWeight: 500 }}>
              Deal
            </span>
          </div>
          <DialogTitle className="text-base leading-snug">{card.headline}</DialogTitle>
          <DialogDescription>{card.sub}</DialogDescription>
        </DialogHeader>

        {card.promo_code && (
          <div className="mt-1">
            <p
              style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}
            >
              Promo Code
            </p>
            <button
              onClick={handleCopy}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 transition-colors active:scale-[0.98]"
              style={{
                border: '1px solid rgba(239,159,39,0.4)',
                background: 'rgba(239,159,39,0.08)',
              }}
            >
              <span
                className="font-mono font-bold tracking-widest"
                style={{ fontSize: '18px', color: '#EF9F27' }}
              >
                {card.promo_code}
              </span>
              {copied ? (
                <Check size={16} style={{ color: '#59FFA0', flexShrink: 0 }} />
              ) : (
                <Copy size={16} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              )}
            </button>
            {copied && (
              <p style={{ marginTop: '6px', textAlign: 'center', fontSize: '12px', color: '#59FFA0' }}>
                Copied to clipboard!
              </p>
            )}
          </div>
        )}

        {card.event_id && (
          <button
            onClick={handleViewEvent}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]"
            style={{ marginTop: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
          >
            View Event
            <ExternalLink size={14} />
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FeedCardItem({ card }: { card: FeedCard }) {
  const router = useRouter()
  const [dealOpen, setDealOpen] = useState(false)
  const color = TYPE_COLOR[card.type]
  const label = TYPE_LABEL[card.type]
  const iconBg = `${color}1F`

  const navigate = () => {
    switch (card.type) {
      case 'announcement':
        if (!card.cta_url) return
        if (card.cta_url.startsWith('/')) {
          router.push(card.cta_url)
        } else {
          window.open(card.cta_url, '_blank', 'noopener,noreferrer')
        }
        break
      case 'curated':
        if (card.event_id) router.push(`/events/${card.event_id}`)
        break
      case 'deal':
        setDealOpen(true)
        break
      case 'featured':
        if (card.event_id) router.push(`/events/${card.event_id}`)
        break
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate()
  }

  return (
    <>
      <div
        onClick={navigate}
        className="active:scale-[0.98] transition-transform"
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
          cursor: 'pointer',
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
          {card.image_url ? (
            <img
              src={card.image_url}
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
            onClick={handleActionClick}
            role="button"
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

      {card.type === 'deal' && (
        <DealModal card={card} open={dealOpen} onClose={() => setDealOpen(false)} />
      )}
    </>
  )
}

function FeedCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{
        width: '280px',
        height: '84px',
        flexShrink: 0,
        background: '#2a2929',
        borderRadius: '12px',
      }}
    />
  )
}

export function AnnouncementFeed() {
  const [cards, setCards] = useState<FeedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/v1/feed-cards')
        if (!res.ok) throw new Error('Failed to load feed cards')
        const data: ApiFeedCard[] = await res.json()
        if (!cancelled) setCards(data.map(mapApiCard))
      } catch (err) {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && (failed || cards.length === 0)) return null

  return (
    <section style={{ paddingTop: '16px', paddingBottom: '4px' }}>
      <p
        className="font-label text-xs uppercase tracking-widest text-amber-400 mb-3"
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
        {loading
          ? [...Array(3)].map((_, i) => <FeedCardSkeleton key={i} />)
          : cards.map((card) => <FeedCardItem key={card.id} card={card} />)}
      </div>
    </section>
  )
}
