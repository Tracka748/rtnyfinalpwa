'use client'

import { useState } from 'react'
import GroupHero from './GroupHero'
import GroupOrganizers from './GroupOrganizers'
import GroupPostFeed from './GroupPostFeed'
import GroupPollWidget from './GroupPollWidget'
import GroupEventsList from './GroupEventsList'
import GroupSpotlight from './GroupSpotlight'
import GroupMembersPreview from './GroupMembersPreview'
import GroupAbout from './GroupAbout'
import RelatedGroups from './RelatedGroups'
import type { Group, GroupPost, GroupPoll, GroupOrganizer, GroupSpotlight as SpotlightType } from '@/types/groups'

interface Props {
  group: Group
  initialIsMember: boolean
  announcements: GroupPost[]
  updates: GroupPost[]
  polls: GroupPoll[]
  events: any[]
  spotlight: SpotlightType | null
  organizers: GroupOrganizer[]
  members: { user_id: string; joined_at: string }[]
  relatedGroups: Group[]
  userVotes: Record<string, string>
}

export default function GroupDetailClient({
  group,
  initialIsMember,
  announcements,
  updates,
  polls,
  events,
  spotlight,
  organizers,
  members,
  relatedGroups,
  userVotes,
}: Props) {
  const [isMember, setIsMember] = useState(initialIsMember)

  return (
    <div className="min-h-screen bg-[#121113]">

      {/* 1. HERO */}
      <GroupHero
        group={group}
        isMember={isMember}
        onMembershipChange={() => setIsMember(prev => !prev)}
      />

      <div className="max-w-2xl mx-auto px-5 py-10 space-y-14">

        {/* 2. ORGANIZERS */}
        <GroupOrganizers
          organizers={organizers}
          accentColor={group.accent_color}
        />

        {/* 3. UPDATES (announcements first, then regular updates) */}
        {(announcements.length > 0 || updates.length > 0) && (
          <GroupPostFeed
            announcements={announcements}
            updates={updates}
            accentColor={group.accent_color}
          />
        )}

        {/* 4. EXCLUSIVE EVENTS */}
        {events.length > 0 && (
          <GroupEventsList
            events={events}
            groupName={group.name}
            accentColor={group.accent_color}
          />
        )}

        {/* 5. FEATURED SPOTLIGHT */}
        {spotlight && (
          <GroupSpotlight
            spotlight={spotlight}
            accentColor={group.accent_color}
          />
        )}

        {/* 6. POLLS */}
        {polls.length > 0 && (
          <section>
            <h2
              className="font-slab-serif text-xl text-white mb-4 pl-3"
              style={{ borderLeft: `3px solid ${group.accent_color}` }}
            >
              Community Polls
            </h2>
            <div className="space-y-4">
              {polls.map(poll => (
                <GroupPollWidget
                  key={poll.id}
                  poll={poll}
                  userVote={userVotes[poll.id] ?? null}
                  groupSlug={group.slug}
                  accentColor={group.accent_color}
                />
              ))}
            </div>
          </section>
        )}

        {/* 7. MEMBERS */}
        {members.length > 0 && (
          <GroupMembersPreview
            members={members}
            memberCount={group.member_count}
            accentColor={group.accent_color}
          />
        )}

        {/* 8. ABOUT + RULES */}
        {(group.about || group.rules) && (
          <GroupAbout
            about={group.about ?? null}
            rules={group.rules ?? null}
            groupName={group.name}
            accentColor={group.accent_color}
          />
        )}

        {/* 9. RELATED GROUPS */}
        {relatedGroups.length > 0 && (
          <RelatedGroups
            groups={relatedGroups}
            currentSlug={group.slug}
            accentColor={group.accent_color}
          />
        )}

      </div>
    </div>
  )
}
