'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import PitchCard from './PitchCard'
import UserPointsBadge from './UserPointsBadge'
import type { EventPitch, PitchFeedback, UserPitchPoints } from '@/types/groups'

interface Props {
  pitches: EventPitch[]
  accentColor: string
  initialFeedback: Record<string, PitchFeedback>
}

export default function GroupPitchSection({ pitches, accentColor, initialFeedback }: Props) {
  const [userFeedback, setUserFeedback] = useState<Record<string, PitchFeedback>>(initialFeedback)
  const [userPoints, setUserPoints] = useState<UserPitchPoints | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_pitch_points')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserPoints(data)
        })
    })
  }, [])

  const refreshPoints = () => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_pitch_points')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => { if (data) setUserPoints(data) })
    })
  }

  if (!pitches.length) return null

  return (
    <section>
      <h2
        className="font-slab-serif text-2xl text-white mb-2 pl-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Shape the Next Event
      </h2>
      <p style={{
        fontFamily: 'Rubik, sans-serif',
        fontSize: '13px',
        color: '#7A7978',
        marginBottom: '16px',
      }}>
        The organizer is pitching ideas. Your input shapes what happens next.
      </p>

      <UserPointsBadge points={userPoints} accentColor={accentColor} />

      <div className="flex flex-col gap-3">
        {pitches.map(pitch => (
          <PitchCard
            key={pitch.id}
            pitch={pitch}
            accentColor={accentColor}
            userFeedback={userFeedback[pitch.id] ?? null}
            onFeedbackSubmitted={(feedback) => {
              setUserFeedback(prev => ({ ...prev, [pitch.id]: feedback }))
              refreshPoints()
            }}
          />
        ))}
      </div>
    </section>
  )
}
