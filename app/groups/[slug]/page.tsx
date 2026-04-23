import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import GroupDetailClient from '@/components/groups/GroupDetailClient'
import { GroupPost, GroupPoll, Group, GroupOrganizer } from '@/types/groups'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const db = createSupabaseAdmin()
  const { data: group } = await db
    .from('groups')
    .select('name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return {
    title: group ? `${group.name} | RTNY` : 'Group | RTNY',
  }
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const db = createSupabaseAdmin()

  // Fetch group
  const { data: group, error: groupError } = await db
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (groupError || !group) notFound()

  // Fetch posts
  const { data: posts } = await db
    .from('group_posts')
    .select('*')
    .eq('group_id', group.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  // Split posts by type
  const announcements = (posts ?? []).filter(p => p.post_type === 'announcement') as GroupPost[]
  const updates = (posts ?? []).filter(p => p.post_type === 'update') as GroupPost[]

  // Fetch polls for poll-type posts
  const pollPostIds = (posts || []).filter(p => p.post_type === 'poll').map(p => p.id)
  let polls: any[] = []
  if (pollPostIds.length > 0) {
    const { data: pollData } = await db
      .from('group_polls')
      .select('*')
      .in('post_id', pollPostIds)
    polls = pollData || []
  }

  // Fetch exclusive events
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const { data: events } = await db
    .from('events')
    .select('*, venues!inner(name, address), ticket_types(*)')
    .eq('group_id', group.id)
    .gte('event_date', `${today}T00:00:00`)
    .order('event_date', { ascending: true })
    .limit(10)

  // Fetch active spotlight
  const { data: spotlight } = await db
    .from('group_spotlights')
    .select('*')
    .eq('group_id', group.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  // Fetch organizers
  const { data: organizers } = await db
    .from('group_organizers')
    .select('*')
    .eq('group_id', group.id)
    .order('sort_order', { ascending: true })

  // Fetch recent members preview
  const { data: members } = await db
    .from('group_memberships')
    .select('user_id, joined_at')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: false })
    .limit(12)

  // Fetch related groups (same category)
  const { data: relatedGroups } = group.category
    ? await db
        .from('groups')
        .select('id, slug, name, tagline, card_image_url, accent_color, member_count, cover_image_url, description, about, rules, category, is_active, sort_order, created_at')
        .eq('category', group.category)
        .neq('id', group.id)
        .eq('is_active', true)
        .limit(3)
    : { data: [] }

  // Fetch active pitches
  const { data: pitchesData } = await db
    .from('event_pitches')
    .select('*')
    .eq('group_id', group.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Auth state + membership + poll votes + pitch feedback
  let is_member = false
  let userVotes: Record<string, string> = {}
  let userPitchFeedback: Record<string, any> = {}

  if (user) {
    const { data: membership } = await db
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    is_member = !!membership

    if (polls.length > 0) {
      const { data: votes } = await db
        .from('group_poll_votes')
        .select('poll_id, option_id')
        .eq('user_id', user.id)
        .in('poll_id', polls.map(p => p.id))
      userVotes = Object.fromEntries((votes || []).map(v => [v.poll_id, v.option_id]))
    }

    if (pitchesData?.length) {
      const pitchIds = pitchesData.map(p => p.id)
      const { data: feedbackData } = await db
        .from('pitch_feedback')
        .select('*')
        .eq('member_id', user.id)
        .in('pitch_id', pitchIds)

      if (feedbackData) {
        feedbackData.forEach(f => { userPitchFeedback[f.pitch_id] = f })
      }
    }
  }

  const eventsWithData = (events || []).map(e => ({
    ...e,
    venue_name: e.venues?.name || null,
    venue_address: e.venues?.address || null,
  }))

  return (
    <main className="min-h-screen bg-[#121113]">
      <GroupDetailClient
        group={group}
        initialIsMember={is_member}
        announcements={announcements}
        updates={updates}
        polls={polls as GroupPoll[]}
        events={eventsWithData}
        spotlight={spotlight ?? null}
        organizers={(organizers ?? []) as GroupOrganizer[]}
        members={members || []}
        relatedGroups={(relatedGroups || []) as Group[]}
        userVotes={userVotes}
        pitches={pitchesData ?? []}
        userPitchFeedback={userPitchFeedback}
      />
    </main>
  )
}
