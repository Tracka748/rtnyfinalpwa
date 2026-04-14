'use client'

import { useState } from 'react'
import PitchCard from './PitchCard'
import type { EventPitch, PitchFeedback } from '@/types/groups'

interface Props {
  pitches: EventPitch[]
  accentColor: string
  initialFeedback: Record<string, PitchFeedback>
}

export default function GroupPitchSection({ pitches, accentColor, initialFeedback }: Props) {
  const [userFeedback, setUserFeedback] = useState<Record<string, PitchFeedback>>(initialFeedback)

  if (!pitches.length) return null

  return (
    <section>
      <h2
        className="font-slab-serif text-2xl text-white mb-2 pl-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Shape the Next Event
      </h2>
      <p
        style={{
          fontFamily: 'Rubik, sans-serif',
          fontSize: '13px',
          color: '#7A7978',
          marginBottom: '20px',
        }}
      >
        The organizer is pitching ideas. Your input shapes what happens next.
      </p>

      <div className="flex flex-col gap-3">
        {pitches.map(pitch => (
          <PitchCard
            key={pitch.id}
            pitch={pitch}
            accentColor={accentColor}
            userFeedback={userFeedback[pitch.id] ?? null}
            onFeedbackSubmitted={(feedback) => {
              setUserFeedback(prev => ({ ...prev, [pitch.id]: feedback }))
            }}
          />
        ))}
      </div>
    </section>
  )
}
