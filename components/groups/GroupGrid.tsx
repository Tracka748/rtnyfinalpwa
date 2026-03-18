import { GroupWithMembership } from '@/types/groups'
import { GroupCard } from './GroupCard'

interface GroupGridProps {
  groups: GroupWithMembership[]
}

export function GroupGrid({ groups }: GroupGridProps) {
  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <h1 className="font-header font-bold text-3xl md:text-4xl text-[#F9FDFF] mb-2">
        Find Your Scene
      </h1>
      <p className="font-sans text-[#A0A0A0] text-sm md:text-base mb-8">
        Rochester&apos;s communities, curated for you
      </p>

      {groups.length === 0 ? (
        <p className="text-center text-[#A0A0A0] font-sans py-16">No groups available</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
