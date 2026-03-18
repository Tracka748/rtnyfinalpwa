'use client'

import { useState } from 'react'
import { Group } from '@/types/groups'
import { JoinGroupButton } from './JoinGroupButton'

function formatMemberCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}k members`
  return `${count} members`
}

interface GroupHeroProps {
  group: Group
  isMember: boolean
  onMembershipChange: () => void
}

export function GroupHero({ group, isMember, onMembershipChange }: GroupHeroProps) {
  const [memberState, setMemberState] = useState(isMember)

  const handleToggle = () => {
    setMemberState(prev => !prev)
    onMembershipChange()
  }

  return (
    <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden">
      {/* Background */}
      {group.cover_image_url ? (
        <img
          src={group.cover_image_url}
          alt={group.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${group.accent_color}80, #121113)` }}
        />
      )}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#121113] via-[#121113]/50 to-transparent" />

      {/* Category badge — top left */}
      {group.category && (
        <div className="absolute top-4 left-4">
          <span
            className="font-label text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: `${group.accent_color}33`, color: group.accent_color }}
          >
            {group.category}
          </span>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 md:px-8 md:pb-8 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-header font-bold text-2xl md:text-4xl text-white leading-tight">
            {group.name}
          </h1>
          {group.tagline && (
            <p className="font-sans text-sm md:text-base text-white/60 mt-1">{group.tagline}</p>
          )}
          <p className="font-label text-xs text-white/40 mt-2 uppercase tracking-wide">
            {formatMemberCount(group.member_count)}
          </p>
        </div>

        <div className="shrink-0">
          <JoinGroupButton
            groupSlug={group.slug}
            isMember={memberState}
            accentColor={group.accent_color}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  )
}
