import { GroupWithMembership } from '@/types/groups'
import { GroupCard } from './GroupCard'

interface Organizer {
  display_name: string
  group_name: string
  group_slug: string
  accent_color: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

interface GroupGridProps {
  groups: GroupWithMembership[]
  organizers: Organizer[]
  accessToken?: string
}

export function GroupGrid({ groups, organizers, accessToken }: GroupGridProps) {
  const hasOrganizers = organizers.length > 0

  return (
    <div>
      {/* SECTION A — Editorial Header */}
      <div className="bg-[#121113] px-6 pt-16 pb-10 border-b border-[#2A2A2A]">
        <div className="max-w-2xl">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[#59FFA0] mb-3">
            RTNY GROUPS
          </p>
          <h1 className="font-slab-serif text-5xl font-bold text-[#F9FDFF] mb-3">
            Find Your Scene
          </h1>
          <p className="text-[#7DD8E8] text-base leading-relaxed max-w-xl">
            Rochester&apos;s communities are curated by local organizers who live and breathe their scene.
            Join a group to unlock exclusive events, connect with your people, and get access before anyone else.
          </p>
          <div className="h-px w-16 bg-[#59FFA0] mt-6" />
        </div>
      </div>

      {/* SECTION B — Meet the Organizers (only when real data exists) */}
      {hasOrganizers && (
      <div className="px-6 py-8 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <p className="font-label text-xs uppercase tracking-[0.2em] text-[#7A7978] mb-5">
          MEET THE ORGANIZERS
        </p>
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
          {organizers.map((org, i) => (
            <div
              key={`${org.group_slug}-${i}`}
              className="bg-[#121113] rounded-2xl px-4 py-3 min-w-[200px] border border-[#2A2A2A] flex-shrink-0"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: `${org.accent_color}33`,
                  color: org.accent_color,
                }}
              >
                {getInitials(org.display_name)}
              </div>
              <p className="text-sm font-bold text-[#F9FDFF] mt-2">{org.display_name}</p>
              {org.group_name && (
                <p className="text-xs text-[#7DD8E8]">{org.group_name}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* SECTION C — Cards list */}
      <p className="font-label text-xs uppercase tracking-[0.2em] text-[#7A7978] px-6 pt-6 pb-3">
        ALL GROUPS
      </p>

      {groups.length === 0 ? (
        <p className="text-center text-[#A0A0A0] font-sans py-16">No groups available</p>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} accessToken={accessToken} />
          ))}
        </div>
      )}
    </div>
  )
}
