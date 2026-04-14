'use client'

import JoinGroupButton from './JoinGroupButton'
import RippedEdge from './RippedEdge'
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
        minHeight: '600px',
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
          top: '-60px',
          left: '-60px',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          backgroundColor: group.accent_color,
          opacity: 0.12,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 4: Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          paddingTop: '48px',
          paddingBottom: '72px',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 md:px-10">

          {/* Category badge */}
          {group.category && (
            <div style={{ marginBottom: '20px' }}>
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
            className="font-slab-serif text-5xl font-bold text-[#F9FDFF]"
            style={{
              margin: '0 0 16px 0',
              lineHeight: 1.0,
              maxWidth: '20ch',
            }}
          >
            {group.name}
          </h1>

          {/* Tagline */}
          {group.tagline && (
            <p
              className="text-lg"
              style={{
                fontFamily: 'Rubik, sans-serif',
                color: `${group.accent_color}cc`,
                margin: '0 0 40px 0',
                maxWidth: '56ch',
                lineHeight: 1.55,
              }}
            >
              {group.tagline}
            </p>
          )}

          {/* Member count + Join button — horizontal row, left-anchored */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
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

      {/* Ripped tear below hero */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <RippedEdge color="#121113" flip={false} height={40} />
      </div>
    </div>
  )
}
