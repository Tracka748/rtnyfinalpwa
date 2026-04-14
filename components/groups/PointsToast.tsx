'use client'

import { useEffect, useState } from 'react'

interface Props {
  earned: number
  newTotal: number
  justUnlocked: boolean
  badge: { title: string; emoji: string } | null
  accentColor: string
  onDismiss: () => void
}

export default function PointsToast({
  earned, newTotal, justUnlocked, badge, accentColor, onDismiss
}: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '80px'})`,
        zIndex: 100,
        backgroundColor: '#1a1a1c',
        border: `1px solid ${accentColor}`,
        padding: '18px 24px',
        minWidth: '260px',
        maxWidth: '90vw',
        transition: 'transform 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      {/* Points earned pill */}
      <div
        style={{
          backgroundColor: accentColor,
          color: '#121113',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '18px',
          fontWeight: 900,
          padding: '8px 16px',
          letterSpacing: '2px',
          flexShrink: 0,
        }}
      >
        +{earned} pts
      </div>

      {/* Message */}
      <div style={{ flex: 1 }}>
        {justUnlocked && badge ? (
          <>
            <p style={{
              fontFamily: 'Rokkitt, serif',
              fontSize: '17px',
              fontWeight: 900,
              color: accentColor,
              margin: '0 0 2px 0',
            }}>
              {badge.emoji} {badge.title} unlocked!
            </p>
            <p style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: '11px',
              color: 'rgba(249,253,255,0.45)',
              margin: 0,
            }}>
              {newTotal} total points
            </p>
          </>
        ) : (
          <>
            <p style={{
              fontFamily: 'Rokkitt, serif',
              fontSize: '14px',
              fontWeight: 800,
              color: '#F9FDFF',
              margin: '0 0 2px 0',
            }}>
              Points earned
            </p>
            <p style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: '11px',
              color: 'rgba(249,253,255,0.45)',
              margin: 0,
            }}>
              {newTotal} total points
            </p>
          </>
        )}
      </div>
    </div>
  )
}
