import { formatDistanceToNow, format } from 'date-fns'
import { GroupPost } from '@/types/groups'

interface GroupPostFeedProps {
  posts: GroupPost[]
  accentColor?: string
}

function PostTypeBadge({ type }: { type: GroupPost['post_type'] }) {
  if (type === 'announcement') {
    return (
      <span className="text-[10px] font-label uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-[#1AC8ED]/20 text-[#1AC8ED]">
        Announcement
      </span>
    )
  }
  if (type === 'poll') {
    return (
      <span className="text-[10px] font-label uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
        Poll
      </span>
    )
  }
  return (
    <span className="text-[10px] font-label uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/50">
      Update
    </span>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 7) return formatDistanceToNow(date, { addSuffix: true })
  return format(date, 'MMM d')
}

export function GroupPostFeed({ posts, accentColor = '#59FFA0' }: GroupPostFeedProps) {
  return (
    <div>
      <h2 className="font-header font-bold text-xl text-[#F9FDFF] mb-4">Updates</h2>

      {posts.length === 0 ? (
        <p className="text-center text-[#A0A0A0] font-sans py-10 text-sm">
          No updates yet. Check back soon.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div
              key={post.id}
              className="relative bg-[#1a1a1c] rounded-xl p-4 border border-white/10"
              style={post.is_pinned ? { borderLeft: `3px solid ${accentColor}` } : undefined}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.is_pinned && (
                    <span
                      className="text-[10px] font-label uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                    >
                      Pinned
                    </span>
                  )}
                  <PostTypeBadge type={post.post_type} />
                </div>
                <span className="font-label text-[11px] text-white/30 shrink-0">
                  {formatDate(post.created_at)}
                </span>
              </div>

              {/* Title */}
              {post.title && (
                <h3 className="font-header font-semibold text-base text-white mb-1">
                  {post.title}
                </h3>
              )}

              {/* Body */}
              <p className="font-sans text-sm text-gray-300 leading-relaxed">{post.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
