'use client'

import Link from 'next/link'
import { GroupWithMembership } from '@/types/groups'

function formatMemberCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}k members`
  return `${count} members`
}

interface GroupCardProps {
  group: GroupWithMembership
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/groups/${group.slug}`} className="block group">
      <article
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ aspectRatio: '4/5' }}
      >
        {/* Background image or gradient */}
        {group.card_image_url ? (
          <img
            src={group.card_image_url}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${group.accent_color}66, #121113)` }}
          />
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121113] via-[#121113]/40 to-transparent" />

        {/* Top row badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {/* Member badge */}
          {group.is_member && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#121113]"
              style={{ backgroundColor: group.accent_color }}
              title="You're a member"
            >
              ✓
            </div>
          )}

          {/* Member count pill */}
          <div className="ml-auto bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full font-label">
            {formatMemberCount(group.member_count)}
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-header font-bold text-xl text-white leading-tight line-clamp-2">
            {group.name}
          </h3>
          {group.tagline && (
            <p className="font-sans text-xs text-white/60 mt-1 line-clamp-2">{group.tagline}</p>
          )}
        </div>
      </article>
    </Link>
  )
}
