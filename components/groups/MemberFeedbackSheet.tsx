'use client'

import { useState } from 'react'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { EventPitch, PitchFeedback } from '@/types/groups'

interface Props {
  pitch: EventPitch
  accentColor: string
  existingFeedback: PitchFeedback | null
  onClose: () => void
  onSubmitted: (feedback: PitchFeedback) => void
}

export default function MemberFeedbackSheet({
  pitch, accentColor, existingFeedback, onClose, onSubmitted
}: Props) {
  const [interestLevel, setInterestLevel] = useState<string>(
    existingFeedback?.interest_level ?? ''
  )
  const [thumbsVote, setThumbsVote] = useState<'up' | 'down' | null>(
    existingFeedback?.thumbs_vote ?? null
  )
  const [priceAcceptable, setPriceAcceptable] = useState<boolean>(
    existingFeedback?.price_acceptable ?? true
  )
  const [preferredLocation, setPreferredLocation] = useState<string>(
    existingFeedback?.preferred_location ?? ''
  )
  const [comments, setComments] = useState<string>(
    existingFeedback?.additional_comments ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceLabel = pitch.price_min === 0 && pitch.price_max === 0
    ? 'Free'
    : `$${pitch.price_min}–$${pitch.price_max}`

  const handleSubmit = async () => {
    if (!interestLevel) {
      setError('Please select your interest level')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`/api/v1/pitches/${pitch.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          interest_level: interestLevel,
          thumbs_vote: thumbsVote,
          price_acceptable: priceAcceptable,
          preferred_location: preferredLocation || null,
          additional_comments: comments || null,
          action_commitment: interestLevel === 'very_interested' ? 'very_interested' : 'interested',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      onSubmitted(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const INTEREST_OPTIONS = [
    { value: 'very_interested', label: "I'm In", sub: 'Count me there' },
    { value: 'somewhat_interested', label: 'Maybe', sub: 'Depends on details' },
    { value: 'not_interested', label: 'Not For Me', sub: 'Pass on this one' },
  ]

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: accentColor,
    marginBottom: '14px',
    fontWeight: 700,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#0d0d0f',
          borderTop: `3px solid ${accentColor}`,
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '24px 20px 40px 20px',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: '48px',
          height: '5px',
          backgroundColor: `${accentColor}44`,
          borderRadius: '2px',
          margin: '0 auto 20px auto',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: accentColor,
              margin: '0 0 4px 0',
              fontWeight: 700,
            }}>
              Shape This Event
            </p>
            <h3 style={{
              fontFamily: 'Rokkitt, serif',
              fontSize: '20px',
              fontWeight: 900,
              color: '#F9FDFF',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {pitch.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pitch summary */}
        <div style={{
          backgroundColor: `${accentColor}11`,
          padding: '12px 14px',
          marginBottom: '24px',
          borderLeft: `4px solid ${accentColor}`,
        }}>
          <p style={{
            fontFamily: 'Rubik, sans-serif',
            fontSize: '13px',
            color: 'rgba(249,253,255,0.65)',
            margin: '0 0 8px 0',
            lineHeight: 1.5,
          }}>
            {pitch.description}
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '16px',
              fontWeight: 900,
              color: accentColor,
            }}>
              {priceLabel}
            </span>
            {pitch.preferred_locations.length > 0 && (
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px', color: 'rgba(249,253,255,0.35)' }}>
                {pitch.preferred_locations.join(' · ')}
              </span>
            )}
          </div>
        </div>

        {/* 1. Interest Level — required */}
        <div style={{ marginBottom: '24px' }}>
          <p style={sectionLabelStyle}>Are you interested?</p>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            {INTEREST_OPTIONS.map(opt => {
              const selected = interestLevel === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setInterestLevel(opt.value)}
                  style={{
                    background: selected ? accentColor : '#1a1a1c',
                    border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      fontFamily: 'Rokkitt, serif',
                      fontSize: '17px',
                      fontWeight: 900,
                      color: selected ? '#121113' : '#F9FDFF',
                      margin: 0,
                    }}>
                      {opt.label}
                    </p>
                    <p style={{
                      fontFamily: 'Rubik, sans-serif',
                      fontSize: '11px',
                      color: selected ? '#12111388' : 'rgba(249,253,255,0.4)',
                      margin: 0,
                    }}>
                      {opt.sub}
                    </p>
                  </div>
                  {selected && (
                    <span style={{ color: '#121113', fontSize: '16px' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Thumbs vote */}
        <div style={{ marginBottom: '24px' }}>
          <p style={sectionLabelStyle}>Quick vote</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['up', 'down'] as const).map(vote => {
              const selected = thumbsVote === vote
              return (
                <button
                  key={vote}
                  onClick={() => setThumbsVote(selected ? null : vote)}
                  aria-label={vote === 'up' ? 'Thumbs up' : 'Thumbs down'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: selected ? accentColor : '#1a1a1c',
                    border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: selected ? '#121113' : 'rgba(249,253,255,0.4)',
                    transition: 'all 0.15s',
                  }}
                >
                  {vote === 'up' ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    {vote === 'up' ? 'Love it' : 'Not sure'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Price acceptable */}
        <div style={{ marginBottom: '24px' }}>
          <p style={sectionLabelStyle}>Does {priceLabel} work for you?</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([true, false] as const).map(val => {
              const selected = priceAcceptable === val
              return (
                <button
                  key={String(val)}
                  onClick={() => setPriceAcceptable(val)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: selected ? accentColor : '#1a1a1c',
                    border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0',
                    cursor: 'pointer',
                    color: selected ? '#121113' : 'rgba(249,253,255,0.4)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1px',
                    transition: 'all 0.15s',
                  }}
                >
                  {val ? 'Works for me' : 'Too expensive'}
                </button>
              )
            })}
          </div>
        </div>

        {/* 4. Preferred location (if multiple options) */}
        {pitch.preferred_locations.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={sectionLabelStyle}>Preferred location</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {pitch.preferred_locations.map(loc => {
                const selected = preferredLocation === loc
                return (
                  <button
                    key={loc}
                    onClick={() => setPreferredLocation(selected ? '' : loc)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: selected ? accentColor : '#1a1a1c',
                      border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0',
                      cursor: 'pointer',
                      color: selected ? '#121113' : 'rgba(249,253,255,0.6)',
                      fontFamily: 'Rubik, sans-serif',
                      fontSize: '13px',
                      fontWeight: selected ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {loc}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. Comments */}
        <div style={{ marginBottom: '28px' }}>
          <p style={sectionLabelStyle}>Anything to add? (optional)</p>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            onFocus={e => { e.target.style.border = `1px solid ${accentColor}` }}
            onBlur={e => { e.target.style.border = `1px solid ${accentColor}33` }}
            maxLength={250}
            placeholder="Suggestions, requests, or just hype..."
            rows={3}
            style={{
              width: '100%',
              backgroundColor: '#121113',
              border: `1px solid ${accentColor}33`,
              borderRadius: '0',
              padding: '12px 14px',
              color: '#F9FDFF',
              fontFamily: 'Rubik, sans-serif',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            color: 'rgba(249,253,255,0.25)',
            textAlign: 'right',
            margin: '4px 0 0 0',
          }}>
            {comments.length}/250
          </p>
        </div>

        {/* Error */}
        {error && (
          <p style={{
            fontFamily: 'Rubik, sans-serif',
            fontSize: '13px',
            color: '#ff6b6b',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}

        {/* Submit CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading || !interestLevel}
          style={{
            width: '100%',
            padding: '18px',
            backgroundColor: !interestLevel ? 'rgba(255,255,255,0.05)' : accentColor,
            border: 'none',
            borderRadius: '0',
            cursor: !interestLevel ? 'not-allowed' : 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: !interestLevel ? 'rgba(255,255,255,0.2)' : '#121113',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Submitting...' : existingFeedback ? 'Update My Input' : "I'm In — Submit"}
        </button>
      </div>
    </>
  )
}
