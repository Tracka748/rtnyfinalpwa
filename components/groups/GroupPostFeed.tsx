import type { GroupPost } from '@/types/groups'

interface Props {
  announcements: GroupPost[]
  updates: GroupPost[]
  accentColor: string
}

export default function GroupPostFeed({ announcements, updates, accentColor }: Props) {
  const hasAnnouncements = announcements.length > 0
  const hasUpdates = updates.length > 0

  if (!hasAnnouncements && !hasUpdates) return null

  return (
    <section>
      <h2
        className="font-slab-serif font-bold text-4xl text-white mb-8 pl-4"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Updates
      </h2>

      <div className="space-y-3">
        {/* Announcements first — accent-tinted border */}
        {announcements.map(post => (
          <div
            key={post.id}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${accentColor}11`,
              border: `1px solid ${accentColor}33`,
              borderLeft: `3px solid ${accentColor}`,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span
                className="font-label text-xs uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${accentColor}22`,
                  color: accentColor,
                }}
              >
                Announcement
              </span>
              <span className="font-sans text-xs text-white/30">
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {post.title && (
              <h3 className="font-slab-serif text-white text-base mb-1">{post.title}</h3>
            )}
            <p className="font-sans text-sm text-white/70 leading-relaxed">{post.body}</p>
          </div>
        ))}

        {/* Regular updates */}
        {updates.map(post => (
          <div
            key={post.id}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: '#1a1a1c',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-label text-xs uppercase tracking-widest text-white/30">
                Update
              </span>
              <span className="font-sans text-xs text-white/30">
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {post.title && (
              <h3 className="font-slab-serif text-white text-base mb-1">{post.title}</h3>
            )}
            <p className="font-sans text-sm text-white/60 leading-relaxed">{post.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
