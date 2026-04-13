import Link from 'next/link'
import { Group } from '@/types/groups'

interface RelatedGroupsProps {
  groups: Group[]
  currentSlug: string
  accentColor: string
}

export default function RelatedGroups({ groups, currentSlug, accentColor }: RelatedGroupsProps) {
  const filtered = groups.filter(g => g.slug !== currentSlug)
  if (filtered.length === 0) return null

  return (
    <div>
      <h2
        className="font-slab-serif font-bold text-xl text-[#F9FDFF] mb-4 pl-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        More Communities
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filtered.map(group => (
          <Link
            key={group.id}
            href={`/groups/${group.slug}`}
            className="relative w-48 flex-shrink-0 rounded-xl overflow-hidden aspect-[3/4] block"
          >
            {/* Background */}
            {group.card_image_url ? (
              <img
                src={group.card_image_url}
                alt={group.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${group.accent_color}80, #121113)`,
                }}
              />
            )}

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Member count badge */}
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              <span className="font-label text-[10px] text-white/80 font-semibold">
                {group.member_count >= 1000
                  ? `${(group.member_count / 1000).toFixed(1).replace('.0', '')}k`
                  : group.member_count}
              </span>
            </div>

            {/* Group name */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="font-slab-serif text-sm font-bold text-white leading-tight line-clamp-2">
                {group.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
