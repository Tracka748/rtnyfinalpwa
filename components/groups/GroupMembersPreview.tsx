interface Props {
  members: { user_id: string; joined_at: string }[]
  memberCount: number
  accentColor: string
}

function getInitials(userId: string): string {
  const chars = userId.replace(/-/g, '')
  return (chars[0] + chars[4]).toUpperCase()
}

export default function GroupMembersPreview({ members, memberCount, accentColor }: Props) {
  const memberLabel = memberCount === 1 ? '1 member' : `${memberCount.toLocaleString()} members`
  const visible = members.slice(0, 10)
  const overflow = memberCount - visible.length

  return (
    <section>
      <h2
        className="font-slab-serif font-bold text-4xl text-white mb-8 pl-4"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Members
      </h2>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Avatar stack */}
        <div className="flex items-center">
          {visible.map((m, i) => (
            <div
              key={m.user_id}
              className="w-9 h-9 rounded-full flex items-center justify-center font-label text-xs font-bold flex-shrink-0"
              style={{
                backgroundColor: `${accentColor}22`,
                border: '2px solid #121113',
                color: accentColor,
                marginLeft: i === 0 ? 0 : '-8px',
                zIndex: visible.length - i,
                position: 'relative',
              }}
            >
              {getInitials(m.user_id)}
            </div>
          ))}

          {overflow > 0 && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-label text-xs text-white/60 flex-shrink-0"
              style={{
                backgroundColor: '#2a2a2e',
                border: '2px solid #121113',
                marginLeft: '-8px',
                position: 'relative',
                zIndex: 0,
              }}
            >
              +{overflow}
            </div>
          )}
        </div>

        <span className="font-sans text-sm text-white/40 ml-2">{memberLabel}</span>
      </div>
    </section>
  )
}
