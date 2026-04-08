'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GroupWithMembership } from '@/types/groups'

function formatMemberCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}k members`
  return `${count} members`
}

interface GroupCardProps {
  group: GroupWithMembership
}

export function GroupCard({ group }: GroupCardProps) {
  const [isMember, setIsMember] = useState(group.is_member)
  const [joining, setJoining] = useState(false)
  const [hovered, setHovered] = useState(false)
  const router = useRouter()

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setJoining(true)
    try {
      const res = await fetch(`/api/v1/groups/${group.slug}/join`, { method: 'POST' })
      if (res.ok) {
        setIsMember(true)
      } else if (res.status === 401) {
        router.push('/login')
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <Link href={`/groups/${group.slug}`} className="block group">
      <article
        className="flex rounded-2xl overflow-hidden bg-[#1C1C1E] border border-[#2A2A2A] shadow-lg transition-all duration-300 group-hover:scale-[1.01] min-h-[140px]"
        style={{
          '--accent': group.accent_color,
          '--accent-alpha': `${group.accent_color}80`,
          boxShadow: hovered ? `0 4px 24px rgba(0,0,0,0.4), inset -3px 0 0 ${group.accent_color}` : undefined,
        } as React.CSSProperties}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Left image block */}
        <div className="w-[100px] shrink-0 rounded-l-2xl overflow-hidden relative">
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[linear-gradient(135deg,var(--accent-alpha),#121113)]" />
          )}
          {/* Subtle inner shadow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
        </div>

        {/* Right content */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          {/* Top */}
          <div>
            <h3 className="font-slab-serif font-bold text-2xl text-[#F9FDFF] leading-tight">
              {group.name}
            </h3>
            {group.category && (
              <span className="inline-block mt-1 mb-3 font-label text-xs uppercase tracking-widest font-semibold text-[var(--accent)]">
                {group.category}
              </span>
            )}
            {group.description && (
              <p className="text-sm leading-relaxed text-[#7DD8E8] line-clamp-4 mb-4">
                {group.description}
              </p>
            )}
          </div>

          {/* Bottom */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#7A7978]">
              {formatMemberCount(group.member_count)}
            </span>
            {isMember ? (
              <span className="bg-[#59FFA0]/10 text-[#59FFA0] text-xs font-medium px-3 py-1 rounded-full">
                ✓ Joined
              </span>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-[#59FFA0] text-[#121113] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#59FFA0]/90 transition disabled:opacity-60"
              >
                {joining ? 'Joining…' : 'Join Group →'}
              </button>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
