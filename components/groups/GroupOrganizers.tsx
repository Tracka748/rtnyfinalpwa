import type { GroupOrganizer } from '@/types/groups'

interface Props {
  organizers: GroupOrganizer[]
  accentColor: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function GroupOrganizers({ organizers, accentColor }: Props) {
  if (!organizers.length) return null

  return (
    <section>
      <h2
        className="font-slab-serif text-xl text-white mb-5 pl-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Organizers
      </h2>

      <div className="flex flex-col gap-3">
        {organizers.map(org => (
          <div
            key={org.id}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{
              backgroundColor: '#1a1a1c',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-label text-sm font-bold overflow-hidden"
              style={{
                backgroundColor: `${accentColor}22`,
                border: `2px solid ${accentColor}44`,
                color: accentColor,
              }}
            >
              {org.avatar_url ? (
                <img
                  src={org.avatar_url}
                  alt={org.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(org.name)
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-slab-serif text-white text-base leading-tight">
                {org.name}
              </p>
              <p
                className="font-label text-xs uppercase tracking-wider mt-0.5"
                style={{ color: accentColor }}
              >
                {org.role}
              </p>
              {org.bio && (
                <p className="font-sans text-sm text-white/50 mt-1 line-clamp-2">
                  {org.bio}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
