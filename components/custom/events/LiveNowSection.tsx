'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

interface LiveEvent {
  id: string
  name: string
  flyer_image_url: string | null
  event_date: string
  status: string
  venues: { name: string } | null
}

const DEV_MOCK: LiveEvent[] = [
  {
    id: 'mock-1',
    name: 'Jazz Night at Montage',
    flyer_image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200&h=220&fit=crop',
    event_date: new Date().toISOString(),
    status: 'active',
    venues: { name: 'Montage Music Hall' },
  },
  {
    id: 'mock-2',
    name: 'Friday Night Vibes',
    flyer_image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=200&h=220&fit=crop',
    event_date: new Date().toISOString(),
    status: 'active',
    venues: { name: 'Lux Lounge' },
  },
  {
    id: 'mock-3',
    name: 'Rooftop Sessions',
    flyer_image_url: null,
    event_date: new Date().toISOString(),
    status: 'active',
    venues: null,
  },
  {
    id: 'mock-4',
    name: 'Bug Jar Open Mic',
    flyer_image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=220&fit=crop',
    event_date: new Date().toISOString(),
    status: 'active',
    venues: { name: 'Bug Jar' },
  },
  {
    id: 'mock-5',
    name: 'Downtown Block Party',
    flyer_image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=200&h=220&fit=crop',
    event_date: new Date().toISOString(),
    status: 'active',
    venues: { name: 'East Ave' },
  },
]

export function LiveNowSection() {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchLiveEvents() {
      const supabase = createBrowserSupabaseClient()

      // Match the date format the events API uses (local time strings, not UTC)
      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('events')
        .select('id, name, flyer_image_url, event_date, status, venues(name)')
        .eq('status', 'active')
        .gte('event_date', `${today}T00:00:00`)
        .lte('event_date', `${today}T23:59:59`)
        .order('event_date', { ascending: true })
        .limit(10)

      const real = data || []
      // In dev with no real events, show mock cards so the UI is visible
      setEvents(real.length > 0 ? real : process.env.NODE_ENV === 'development' ? DEV_MOCK : [])
      setLoaded(true)
    }

    fetchLiveEvents()
  }, [])

  if (!loaded || events.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .live-now-row::-webkit-scrollbar { height: 0; }
      `}</style>

      <section style={{ marginTop: 32, background: '#121113' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#59FFA0',
              boxShadow: '0 0 8px #59FFA0',
              animation: 'pulse 1.6s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'Rokkitt, serif',
              fontWeight: 800,
              fontSize: 20,
              color: '#F9FDFF',
              lineHeight: 1,
            }}>
              Live Now
            </span>
          </div>
          <Link
            href="/events?filter=today"
            style={{
              fontFamily: 'Rubik, sans-serif',
              fontWeight: 500,
              fontSize: 12,
              color: '#1AC8ED',
              textDecoration: 'none',
            }}
          >
            See all →
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div
          className="live-now-row"
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            width: '100%',
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingBottom: '8px',
          }}
        >
          {events.map((event, i) => {
            const venueName = event.venues?.name ?? null
            return (
              <div
                key={event.id}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  animation: 'cardIn 0.35s ease both',
                  animationDelay: `${i * 65}ms`,
                }}
              >
                {/* Card poster */}
                <div
                  style={{
                    position: 'relative',
                    width: 90,
                    height: 100,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {/* Poster image or gradient fallback */}
                  {event.flyer_image_url ? (
                    <Image
                      src={event.flyer_image_url}
                      alt={event.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="90px"
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(160deg, #1a0a2e, #0f3460)',
                    }} />
                  )}

                  {/* Pulsing live dot — top-left */}
                  <span style={{
                    position: 'absolute',
                    top: 5,
                    left: 5,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#59FFA0',
                    boxShadow: '0 0 6px #59FFA0',
                    animation: 'pulse 1.6s ease-in-out infinite',
                    zIndex: 2,
                  }} />

                  {/* Admit One strip — right edge */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 14,
                    height: '100%',
                    background: '#59FFA0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}>
                    {/* Perforation notch */}
                    <div style={{
                      position: 'absolute',
                      left: -2.5,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#121113',
                    }} />
                    {/* Vertical text */}
                    <span style={{
                      fontFamily: 'Rubik, sans-serif',
                      fontWeight: 700,
                      fontSize: 6,
                      color: '#121113',
                      textTransform: 'uppercase',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      letterSpacing: '0.5px',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      Admit One
                    </span>
                  </div>
                </div>

                {/* Text below card */}
                <div style={{ marginTop: 5, width: 90 }}>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: 8,
                    color: '#F9FDFF',
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 90,
                    margin: 0,
                  }}>
                    {event.name}
                  </p>
                  <p style={{
                    fontFamily: 'Rubik, sans-serif',
                    fontWeight: 500,
                    fontSize: 7,
                    margin: '3px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    overflow: 'hidden',
                  }}>
                    {venueName ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#59FFA0',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          color: 'rgba(249,253,255,0.45)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {venueName}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#1AC8ED',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          color: '#1AC8ED',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          Tap for location
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
