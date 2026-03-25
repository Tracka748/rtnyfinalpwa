export interface Group {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  cover_image_url: string | null
  card_image_url: string | null
  accent_color: string
  category: string | null
  member_count: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  notifications_enabled: boolean
}

export interface GroupPost {
  id: string
  group_id: string
  author_id: string | null
  title: string | null
  body: string
  post_type: 'update' | 'announcement' | 'poll'
  is_pinned: boolean
  created_at: string
}

export interface PollOption {
  id: string
  label: string
  votes: number
}

export interface GroupPoll {
  id: string
  group_id: string
  post_id: string | null
  question: string
  options: PollOption[]
  closes_at: string | null
  created_at: string
}

export interface GroupWithMembership extends Group {
  is_member?: boolean
  user_vote?: string | null // option_id if voted
}

// ─── Client component ───────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { GroupHero } from './GroupHero'
import { GroupPostFeed } from './GroupPostFeed'
import { GroupPollWidget } from './GroupPollWidget'
import { GroupEventsList } from './GroupEventsList'

interface GroupDetailClientProps {
  group: Group
  initialIsMember: boolean
  posts: GroupPost[] | null
  polls: (GroupPoll & { user_vote?: string | null })[]
  events: any[]
  userVotes: Record<string, string>
}

export function GroupDetailClient({
  group,
  initialIsMember,
  posts,
  polls,
  events,
}: GroupDetailClientProps) {
  const [isMember, setIsMember] = useState(initialIsMember)

  const regularPosts = (posts || []).filter(p => p.post_type !== 'poll') as GroupPost[]
  const pollsByPostId = Object.fromEntries(polls.map(p => [p.post_id, p]))
  const pollPosts = (posts || []).filter(p => p.post_type === 'poll') as GroupPost[]

  return (
    <div>
      <GroupHero
        group={group}
        isMember={isMember}
        onMembershipChange={() => setIsMember(prev => !prev)}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-10">
        {/* Group description */}
        {group.description && (
          <p className="font-sans text-sm text-[#7DD8E8] leading-relaxed">{group.description}</p>
        )}

        {/* Polls */}
        {pollPosts.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-header font-bold text-xl text-[#F9FDFF]">Polls</h2>
            {pollPosts.map(post => {
              const poll = pollsByPostId[post.id]
              if (!poll) return null
              return (
                <GroupPollWidget
                  key={poll.id}
                  poll={poll}
                  groupSlug={group.slug}
                  accentColor={group.accent_color}
                />
              )
            })}
          </div>
        )}

        {/* Posts */}
        <GroupPostFeed posts={regularPosts} accentColor={group.accent_color} />

        {/* Exclusive events */}
        {events.length > 0 && (
          <GroupEventsList
            events={events}
            groupName={group.name}
            accentColor={group.accent_color}
          />
        )}
      </div>
    </div>
  )
}
