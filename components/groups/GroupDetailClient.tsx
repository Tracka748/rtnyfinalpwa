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
import GroupValueSection from './GroupValueSection'
import GroupPitchSection from './GroupPitchSection'
import RippedEdge from './RippedEdge'
import type { Group, GroupPost, GroupPoll, GroupOrganizer, GroupSpotlight as SpotlightType, EventPitch, PitchFeedback } from '@/types/groups'

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
  pitches: EventPitch[]
  userPitchFeedback: Record<string, PitchFeedback>
}

const MINT = '#59FFA0'
const CYAN = '#1AC8ED'

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
  pitches,
  userPitchFeedback,
}: Props) {
  const [isMember, setIsMember] = useState(initialIsMember)
  const accent = group.accent_color || MINT

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121113' }}>

      {/* 1. HERO */}
      <GroupHero
        group={group}
        isMember={isMember}
        onMembershipChange={() => setIsMember(prev => !prev)}
      />

      {/* 2. WHAT YOU GET */}
      <RippedEdge color={accent} height={40} />
      <GroupValueSection group={group} />

      {/* 3. UPCOMING EVENTS */}
      <RippedEdge color={MINT} height={40} />
      <section style={{ backgroundColor: '#121113' }} className="px-6 md:px-10 py-10">
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <h2
            className="font-slab-serif text-2xl text-white mb-6 pl-3"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            {group.name} Events
          </h2>
          {events.length > 0 ? (
            <GroupEventsList events={events} groupName={group.name} accentColor={accent} />
          ) : (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: '#1a1a1c', border: `1px solid ${accent}22` }}
            >
              <p className="font-slab-serif text-white text-lg mb-2">No events scheduled yet</p>
              <p className="font-sans text-sm" style={{ color: '#7A7978' }}>
                Exclusive {group.name} events will appear here. Join to get notified first.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. ORGANIZERS */}
      {organizers.length > 0 && (
        <>
          <RippedEdge color={accent} height={40} />
          <section style={{ backgroundColor: '#1a1a1c' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <GroupOrganizers organizers={organizers} accentColor={accent} />
            </div>
          </section>
        </>
      )}

      {/* 5. ACTIVITY FEED */}
      <RippedEdge color={MINT} height={40} />
      <section style={{ backgroundColor: '#121113' }} className="px-6 md:px-10 py-10">
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          {(announcements.length > 0 || updates.length > 0) ? (
            <GroupPostFeed
              announcements={announcements}
              updates={updates}
              accentColor={MINT}
            />
          ) : (
            <div>
              <h2
                className="font-slab-serif text-2xl text-white mb-6 pl-3"
                style={{ borderLeft: `3px solid ${MINT}` }}
              >
                Activity
              </h2>
              <div
                className="rounded-xl p-8 text-center"
                style={{ backgroundColor: '#1a1a1c', border: `1px solid ${MINT}1f` }}
              >
                <p className="font-slab-serif text-white text-lg mb-2">Nothing posted yet</p>
                <p className="font-sans text-sm" style={{ color: '#7A7978' }}>
                  {isMember
                    ? `Check back soon for exclusive updates, announcements, and perks from your organizer.`
                    : `Join ${group.name} to get updates on exclusive events and perks.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. SHAPE THE NEXT EVENT */}
      {pitches.length > 0 && (
        <>
          <RippedEdge color={group.accent_color} height={40} />
          <section style={{ backgroundColor: '#1a1a1c' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <GroupPitchSection
                pitches={pitches}
                accentColor={group.accent_color}
                initialFeedback={userPitchFeedback}
              />
            </div>
          </section>
        </>
      )}

      {/* 7. FEATURED SPOTLIGHT */}
      {spotlight && (
        <>
          <RippedEdge color={CYAN} height={40} />
          <section style={{ backgroundColor: '#1a1a1c' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <GroupSpotlight spotlight={spotlight} accentColor={CYAN} />
            </div>
          </section>
        </>
      )}

      {/* 8. POLLS */}
      {polls.length > 0 && (
        <>
          <RippedEdge color={CYAN} height={40} />
          <section style={{ backgroundColor: '#121113' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <h2
                className="font-slab-serif text-2xl text-white mb-6 pl-3"
                style={{ borderLeft: `3px solid ${CYAN}` }}
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
                    accentColor={CYAN}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* 9. MEMBERS */}
      {members.length > 0 && (
        <>
          <RippedEdge color={accent} height={40} />
          <section style={{ backgroundColor: '#1a1a1c' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <GroupMembersPreview
                members={members}
                memberCount={group.member_count}
                accentColor={accent}
              />
            </div>
          </section>
        </>
      )}

      {/* 10. ABOUT + RULES */}
      {(group.about || group.rules) && (
        <>
          <RippedEdge color={MINT} height={40} />
          <section style={{ backgroundColor: '#121113' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <GroupAbout
                about={group.about ?? null}
                rules={group.rules ?? null}
                groupName={group.name}
                accentColor={MINT}
              />
            </div>
          </section>
        </>
      )}

      {/* 11. RELATED GROUPS */}
      {relatedGroups.length > 0 && (
        <>
          <RippedEdge color={CYAN} height={40} />
          <section style={{ backgroundColor: '#1a1a1c' }} className="px-6 md:px-10 py-10">
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <RelatedGroups
                groups={relatedGroups}
                currentSlug={group.slug}
                accentColor={accent}
              />
            </div>
          </section>
        </>
      )}

      {/* Bottom breathing room */}
      <div style={{ height: '60px', backgroundColor: '#121113' }} />

    </div>
  )
}
