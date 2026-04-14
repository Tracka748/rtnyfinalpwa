'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { EventPitch, PitchFeedback } from '@/types/groups'
import MemberFeedbackSheet from './MemberFeedbackSheet'
import PointsToast from './PointsToast'

interface PointsData {
  earned: number
  newTotal: number
  justUnlocked: boolean
  badge: { title: string; emoji: string } | null
}

interface Props {
  pitch: EventPitch
  accentColor: string
  userFeedback?: PitchFeedback | null
  onFeedbackSubmitted: (feedback: PitchFeedback) => void
}

export default function PitchCard({
  pitch, accentColor, userFeedback, onFeedbackSubmitted
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showFullForm, setShowFullForm] = useState(false)
  const [toast, setToast] = useState<PointsData | null>(null)

  // Quick action local state
  const [interested, setInterested] = useState<'yes' | 'maybe' | 'no' | null>(
    userFeedback?.interest_level === 'very_interested' ? 'yes'
    : userFeedback?.interest_level === 'somewhat_interested' ? 'maybe'
    : userFeedback?.interest_level === 'not_interested' ? 'no'
    : null
  )
  const [dateVote,     setDateVote]     = useState<'up'|'down'|null>(null)
  const [locationVote, setLocationVote] = useState<'up'|'down'|null>(null)
  const [priceVote,    setPriceVote]    = useState<'up'|'down'|null>(null)

  const hasResponded = !!userFeedback
  const priceLabel = pitch.price_min === 0 && pitch.price_max === 0
    ? 'Free'
    : `$${pitch.price_min}–$${pitch.price_max}`
  const dateLabel = new Date(pitch.date_start).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  }) + ' – ' + new Date(pitch.date_end).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
  const locationLabel = pitch.preferred_locations.length
    ? pitch.preferred_locations.join(' · ')
    : 'TBD'

  // Mini thumbs button
  const Thumb = ({
    dir, active, onPress
  }: { dir: 'up'|'down', active: boolean, onPress: () => void }) => (
    <button
      onClick={e => { e.stopPropagation(); onPress() }}
      aria-label={dir === 'up' ? 'Thumbs up' : 'Thumbs down'}
      style={{
        background: active ? accentColor : 'rgba(255,255,255,0.06)',
        border: 'none',
        borderRadius: '0',
        width: '32px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: active ? '#121113' : 'rgba(255,255,255,0.35)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {dir === 'up' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
    </button>
  )

  // A single quick-action row
  const QuickRow = ({
    label, value, vote, onUp, onDown
  }: {
    label: string
    value: string
    vote: 'up'|'down'|null
    onUp: () => void
    onDown: () => void
  }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      gap: '8px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '9px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: accentColor,
          fontWeight: 700,
          display: 'block',
          marginBottom: '2px',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'Rubik, sans-serif',
          fontSize: '13px',
          color: '#F9FDFF',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <Thumb dir="up"   active={vote === 'up'}   onPress={onUp} />
        <Thumb dir="down" active={vote === 'down'}  onPress={onDown} />
      </div>
    </div>
  )

  const handleQuickSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!interested) return

    const interestMap = {
      yes:   'very_interested',
      maybe: 'somewhat_interested',
      no:    'not_interested',
    } as const

    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      }

      // Submit feedback
      const feedbackRes = await fetch(`/api/v1/pitches/${pitch.id}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          interest_level: interestMap[interested],
          price_acceptable: priceVote === 'up' ? true : priceVote === 'down' ? false : true,
          preferred_location: pitch.preferred_locations[0] ?? null,
        }),
      })
      const feedbackData = await feedbackRes.json()
      if (feedbackData.data) onFeedbackSubmitted(feedbackData.data)

      // Award quick-action points
      const actionsToLog: string[] = ['quick_submit']
      if (dateVote)     actionsToLog.push('date_vote')
      if (locationVote) actionsToLog.push('location_vote')
      if (priceVote)    actionsToLog.push('price_vote')

      const pointsRes = await fetch(`/api/v1/pitches/${pitch.id}/quick-points`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ actions: actionsToLog }),
      })
      const pointsData = await pointsRes.json()
      if (pointsData.points) setToast(pointsData.points)
    } catch (err) {
      console.error('Quick submit error:', err)
    }

    setExpanded(false)
  }

  return (
    <>
      <div
        style={{
          backgroundColor: '#1a1a1c',
          border: hasResponded
            ? `2px solid ${accentColor}`
            : '1px solid rgba(255,255,255,0.08)',
          borderLeft: `4px solid ${hasResponded ? accentColor : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '0',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
      >
        {/* ── COLLAPSED HEADER — always visible ── */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ padding: '16px', cursor: 'pointer', backgroundColor: hasResponded ? `${accentColor}08` : 'transparent' }}
        >
          {/* Top row: category + price */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: accentColor,
              fontWeight: 700,
            }}>
              {pitch.category}
            </span>
            <span style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '15px',
              fontWeight: 700,
              color: '#F9FDFF',
            }}>
              {priceLabel}
            </span>
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: 'Rokkitt, serif',
            fontSize: '18px',
            fontWeight: 900,
            color: '#F9FDFF',
            margin: '0 0 10px 0',
            lineHeight: 1.2,
          }}>
            {pitch.title}
          </h3>

          {/* Description — clamped when collapsed */}
          <p style={{
            fontFamily: 'Rubik, sans-serif',
            fontSize: '13px',
            color: 'rgba(249,253,255,0.55)',
            margin: '0 0 12px 0',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: expanded ? 'visible' : 'hidden',
          }}>
            {pitch.description}
          </p>

          {/* Bottom: interest count + expand indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ThumbsUp size={12} color={accentColor} />
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                color: accentColor,
                fontWeight: 700,
              }}>
                {pitch.interest_count} interested
              </span>
              {hasResponded && (
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '10px',
                  color: 'rgba(249,253,255,0.3)',
                  marginLeft: '4px',
                }}>
                  · you're one of them
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'rgba(255,255,255,0.35)',
            }}>
              {hasResponded && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: `${accentColor}22`,
                  border: `1px solid ${accentColor}`,
                  padding: '4px 10px',
                  marginRight: '6px',
                }}>
                  <span style={{ fontSize: '12px' }}>✓</span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '9px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: accentColor,
                    fontWeight: 700,
                  }}>
                    Responded
                  </span>
                </div>
              )}
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                {expanded ? 'Close' : 'Weigh In'}
              </span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </div>

        {/* ── EXPANDED QUICK ACTIONS ── */}
        {expanded && (
          <div style={{
            borderTop: `1px solid ${accentColor}33`,
            backgroundColor: '#121113',
            padding: '4px 16px 0 16px',
          }}>
            {/* INTERESTED? — 3 button row */}
            <div style={{
              padding: '12px 0 10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: accentColor,
                fontWeight: 700,
                display: 'block',
                marginBottom: '8px',
              }}>
                Interested?
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { val: 'yes',   label: 'Yes' },
                  { val: 'maybe', label: 'Maybe' },
                  { val: 'no',    label: 'No' },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    onClick={e => {
                      e.stopPropagation()
                      setInterested(interested === opt.val ? null : opt.val)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: interested === opt.val ? accentColor : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '0',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: interested === opt.val ? '#121113' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <QuickRow
              label="Date"
              value={dateLabel}
              vote={dateVote}
              onUp={() => setDateVote(dateVote === 'up' ? null : 'up')}
              onDown={() => setDateVote(dateVote === 'down' ? null : 'down')}
            />
            <QuickRow
              label="Location"
              value={locationLabel}
              vote={locationVote}
              onUp={() => setLocationVote(locationVote === 'up' ? null : 'up')}
              onDown={() => setLocationVote(locationVote === 'down' ? null : 'down')}
            />
            <QuickRow
              label="Price"
              value={priceLabel}
              vote={priceVote}
              onUp={() => setPriceVote(priceVote === 'up' ? null : 'up')}
              onDown={() => setPriceVote(priceVote === 'down' ? null : 'down')}
            />

            {/* Actions row */}
            <div style={{ display: 'flex', gap: '8px', padding: '14px 0 16px 0' }}>
              <button
                onClick={handleQuickSubmit}
                disabled={!interested}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: interested ? accentColor : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '0',
                  cursor: interested ? 'pointer' : 'not-allowed',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: interested ? '#121113' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.15s',
                }}
              >
                Submit
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowFullForm(true) }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${accentColor}55`,
                  borderRadius: '0',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: accentColor,
                  transition: 'all 0.15s',
                }}
              >
                More Input
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full form sheet */}
      {showFullForm && (
        <MemberFeedbackSheet
          pitch={pitch}
          accentColor={accentColor}
          existingFeedback={userFeedback ?? null}
          onClose={() => setShowFullForm(false)}
          onSubmitted={(feedback, pointsData) => {
            onFeedbackSubmitted(feedback)
            if (pointsData) setToast(pointsData)
            setShowFullForm(false)
          }}
        />
      )}

      {/* Points toast */}
      {toast && (
        <PointsToast
          earned={toast.earned}
          newTotal={toast.newTotal}
          justUnlocked={toast.justUnlocked}
          badge={toast.badge}
          accentColor={accentColor}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  )
}
