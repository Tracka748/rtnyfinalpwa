'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

interface LiveSlot {
  id: string
  title: string
  venue: string
  img: string
  live: boolean
  featured: boolean
}

export function LiveNowSection() {
  const [events, setEvents] = useState<LiveSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLiveSlots() {
      try {
        // Primary: paid live_now_slots from the API
        const res = await fetch('/api/v1/live-now')
        const json = await res.json()
        if (json.success && json.data?.length) {
          setEvents(
            json.data.map((slot: any) => ({
              id: slot.id,
              title: slot.title,
              venue: slot.venue,
              img: slot.image_url ?? '/placeholder-event.jpg',
              live: true,
              featured: false,
            }))
          )
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('LiveNowSection API error:', err)
      }

      // Fallback: today's active events directly from Supabase
      try {
        const supabase = createBrowserSupabaseClient()
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('events')
          .select('id, name, flyer_image_url, event_date, status, venues(name)')
          .eq('status', 'active')
          .gte('event_date', `${today}T00:00:00`)
          .lte('event_date', `${today}T23:59:59`)
          .order('event_date', { ascending: true })
          .limit(10)

        if (data?.length) {
          setEvents(
            data.map((e: any) => ({
              id: e.id,
              title: e.name,
              venue: e.venues?.name ?? 'Location TBD',
              img: e.flyer_image_url ?? '/placeholder-event.jpg',
              live: true,
              featured: false,
            }))
          )
        }
      } catch (err) {
        console.error('LiveNowSection fallback error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveSlots()
  }, [])

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
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1C1B1E 25%, #252428 50%, #1C1B1E 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
          border-radius: 8px;
        }
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
          {/* Skeleton rows while loading */}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
              <div className="skeleton" style={{ width: 90, height: 100 }} />
              <div className="skeleton" style={{ width: 70, height: 8, marginTop: 6 }} />
              <div className="skeleton" style={{ width: 50, height: 7, marginTop: 4 }} />
            </div>
          ))}

          {/* Empty state */}
          {!loading && events.length === 0 && (
            <div style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#1C1B1E',
              border: '1px solid rgba(89,255,160,0.15)',
              borderRadius: 8,
              padding: '12px 16px',
              width: 220,
              height: 100,
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'rgba(89,255,160,0.3)',
                flexShrink: 0,
              }} />
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: 10,
                  color: '#F9FDFF',
                  textTransform: 'uppercase',
                  margin: 0,
                }}>
                  No live events right now
                </p>
                <p style={{
                  fontFamily: 'Rubik, sans-serif',
                  fontSize: 9,
                  color: 'rgba(249,253,255,0.4)',
                  margin: '4px 0 0',
                }}>
                  Check back soon or browse upcoming events
                </p>
              </div>
            </div>
          )}

          {/* Live cards */}
          {!loading && events.map((event, i) => {
            const isExpanded = expandedId === event.id
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
                  onClick={() => setExpandedId(prev => prev === event.id ? null : event.id)}
                  style={{
                    position: 'relative',
                    width: isExpanded ? 220 : 118,
                    height: 100,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {/* Poster image or gradient fallback */}
                  <Image
                    src={event.img}
                    alt={event.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="220px"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />

                  {/* Gradient fallback layer (always behind image) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(160deg, #1a0a2e, #0f3460)',
                    zIndex: 0,
                  }} />

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

                  {/* Expanded overlay: venue name */}
                  {isExpanded && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 14,
                      padding: '18px 10px 8px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                      zIndex: 3,
                    }}>
                      <p style={{
                        fontFamily: 'Rubik, sans-serif',
                        fontSize: 10,
                        color: 'rgba(249,253,255,0.7)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        📍 {event.venue}
                      </p>
                    </div>
                  )}

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
                <div style={{ marginTop: 5, width: isExpanded ? 220 : 118, transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: 8,
                    color: '#F9FDFF',
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {event.title}
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
                    {event.venue && event.venue !== 'Location TBD' ? (
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
                          {event.venue}
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
