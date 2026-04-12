'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GroupWithMembership } from '@/types/groups'
import { ChevronDown, ChevronUp, Lock } from 'lucide-react'

function formatMemberCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}k members`
  return `${count} members`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface FeedItem {
  id: string
  item_type: string
  title: string
  body: string | null
  created_at: string
}

interface GroupCardProps {
  group: GroupWithMembership
  accessToken?: string
}

export function GroupCard({ group, accessToken }: GroupCardProps) {
  const [isMember, setIsMember] = useState(group.is_member)
  const [joining, setJoining] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [feed, setFeed] = useState<FeedItem[] | null>(null)
  const [feedLoading, setFeedLoading] = useState(false)
  const router = useRouter()

  const handleJoin = async (e: React.MouseEvent) => {
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

  const handleToggle = async () => {
    const next = !expanded
    setExpanded(next)

    if (next && isMember && feed === null) {
      setFeedLoading(true)
      try {
        const res = await fetch(`/api/v1/groups/${group.slug}/feed`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          setFeed(json.data ?? [])
        } else {
          setFeed([])
        }
      } catch {
        setFeed([])
      } finally {
        setFeedLoading(false)
      }
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden bg-[#1C1C1E] border border-[#2A2A2A] shadow-lg cursor-pointer"
      style={{
        '--accent': group.accent_color,
        '--accent-alpha': `${group.accent_color}80`,
        boxShadow: hovered ? `0 4px 24px rgba(0,0,0,0.4), inset -3px 0 0 ${group.accent_color}` : undefined,
      } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleToggle}
    >
      {/* Collapsed card row */}
      <div className="flex min-h-[140px]">
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
            <div className="flex items-center gap-2">
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
              {expanded
                ? <ChevronUp size={16} className="text-[#7A7978] ml-2 shrink-0" />
                : <ChevronDown size={16} className="text-[#7A7978] ml-2 shrink-0" />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="bg-[#1A1A1A] border-t border-[#2A2A2A] px-5 py-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Top row — join CTA or member status */}
          {isMember ? (
            <p className="text-[#59FFA0] font-medium mb-4 text-center text-sm">✓ You&apos;re a member</p>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="bg-[#59FFA0] text-[#121113] font-bold px-6 py-2 rounded-full w-full text-center mb-4 disabled:opacity-60"
            >
              {joining ? 'Joining…' : 'Join Group'}
            </button>
          )}

          {/* Feed section */}
          <p className="font-label text-xs uppercase tracking-widest text-[#7A7978] mb-3">
            LATEST UPDATES
          </p>

          {!isMember ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Lock size={14} className="text-[#7A7978]" />
              <span className="text-sm text-[#7A7978]">Join to see group updates</span>
            </div>
          ) : feedLoading ? (
            <p className="text-xs text-[#7A7978]">Loading updates...</p>
          ) : feed && feed.length > 0 ? (
            <div className="flex flex-col gap-3">
              {feed.slice(0, 3).map(item => (
                <div key={item.id}>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#2A2A2A] text-[#7DD8E8] text-xs px-2 py-0.5 rounded-full uppercase">
                      {item.item_type}
                    </span>
                    <span className="text-sm font-medium text-[#F9FDFF]">{item.title}</span>
                  </div>
                  {item.body && (
                    <p className="text-xs text-[#7A7978] mt-1 line-clamp-2">{item.body}</p>
                  )}
                  <p className="text-xs text-[#7A7978] mt-1">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#7A7978]">No updates yet.</p>
          )}

          {/* View full group link — members only */}
          {isMember && (
            <a
              href={`/groups/${group.slug}`}
              className="block mt-4 text-xs text-[#1AC8ED]"
              onClick={e => e.stopPropagation()}
            >
              View Full Group →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
