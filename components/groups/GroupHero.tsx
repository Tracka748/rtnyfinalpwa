'use client'

import JoinGroupButton from './JoinGroupButton'
import type { Group } from '@/types/groups'

interface Props {
  group: Group
  isMember: boolean
  onMembershipChange: () => void
}

export default function GroupHero({ group, isMember, onMembershipChange }: Props) {
  const memberLabel = group.member_count === 1
    ? '1 Member'
    : `${group.member_count.toLocaleString()} Members`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '360px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Layer 1: Background */}
      {group.cover_image_url ? (
        <img
          src={group.cover_image_url}
          alt={group.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${group.accent_color}55 0%, #1a1a2e 50%, #121113 100%)`,
          }}
        />
      )}

      {/* Layer 2: Bottom fade to page background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #121113 0%, #121113aa 35%, transparent 100%)',
        }}
      />

      {/* Layer 3: Glow blob */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          left: '-40px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: group.accent_color,
          opacity: 0.12,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 4: Content — this is what was missing */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '0 24px 36px 24px',
        }}
      >
        {/* Category badge */}
        {group.category && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: `${group.accent_color}22`,
                color: group.accent_color,
                border: `1px solid ${group.accent_color}55`,
              }}
            >
              {group.category}
            </span>
          </div>
        )}

        {/* Group name */}
        <h1
          style={{
            fontFamily: 'Rokkitt, serif',
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#F9FDFF',
            margin: '0 0 8px 0',
            lineHeight: 1.1,
          }}
        >
          {group.name}
        </h1>

        {/* Tagline */}
        {group.tagline && (
          <p
            style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: '0.95rem',
              color: `${group.accent_color}cc`,
              margin: '0 0 16px 0',
            }}
          >
            {group.tagline}
          </p>
        )}

        {/* Member count + Join button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <span
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(249,253,255,0.45)',
            }}
          >
            {memberLabel}
          </span>

          <JoinGroupButton
            groupSlug={group.slug}
            isMember={isMember}
            accentColor={group.accent_color}
            onToggle={onMembershipChange}
          />
        </div>
      </div>
    </div>
  )
}
