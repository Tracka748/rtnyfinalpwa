import type { UserPitchPoints } from '@/types/groups'

interface Props {
  points: UserPitchPoints | null
  accentColor: string
}

export default function UserPointsBadge({ points, accentColor }: Props) {
  if (!points || points.total_points === 0) return null

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: `${accentColor}15`,
        border: `1px solid ${accentColor}33`,
        padding: '6px 12px',
        marginBottom: '16px',
      }}
    >
      {points.badge_emoji && (
        <span style={{ fontSize: '14px' }}>{points.badge_emoji}</span>
      )}
      <div>
        {points.badge_title && (
          <span style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: accentColor,
            marginRight: '8px',
          }}>
            {points.badge_title}
          </span>
        )}
        <span style={{
          fontFamily: 'Rubik, sans-serif',
          fontSize: '11px',
          color: 'rgba(249,253,255,0.4)',
        }}>
          {points.total_points} pts
        </span>
      </div>
    </div>
  )
}
