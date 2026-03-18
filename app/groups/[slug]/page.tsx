import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GroupDetailClient } from '@/components/groups/GroupDetailClient'
import { GroupPost, GroupPoll } from '@/types/groups'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
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

  // Fetch group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (groupError || !group) notFound()

  // Fetch posts
  const { data: posts } = await supabase
    .from('group_posts')
    .select('*')
    .eq('group_id', group.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch polls for poll-type posts
  const pollPostIds = (posts || []).filter(p => p.post_type === 'poll').map(p => p.id)
  let polls: any[] = []
  if (pollPostIds.length > 0) {
    const { data: pollData } = await supabase
      .from('group_polls')
      .select('*')
      .in('post_id', pollPostIds)
    polls = pollData || []
  }

  // Fetch exclusive events
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const { data: events } = await supabase
    .from('events')
    .select('*, venues!inner(name, address), ticket_types(*)')
    .eq('group_id', group.id)
    .gte('event_date', `${today}T00:00:00`)
    .order('event_date', { ascending: true })
    .limit(10)

  // Auth state + membership + poll votes
  const { data: { user } } = await supabase.auth.getUser()
  let is_member = false
  let userVotes: Record<string, string> = {}

  if (user) {
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    is_member = !!membership

    if (polls.length > 0) {
      const { data: votes } = await supabase
        .from('group_poll_votes')
        .select('poll_id, option_id')
        .eq('user_id', user.id)
        .in('poll_id', polls.map(p => p.id))
      userVotes = Object.fromEntries((votes || []).map(v => [v.poll_id, v.option_id]))
    }
  }

  const pollsWithVotes = polls.map(p => ({ ...p, user_vote: userVotes[p.id] ?? null }))
  const pollsByPostId = Object.fromEntries(pollsWithVotes.map(p => [p.post_id, p]))

  const eventsWithData = (events || []).map(e => ({
    ...e,
    venue_name: e.venues?.name || null,
    venue_address: e.venues?.address || null,
  }))

  // Separate poll posts from regular posts
  const regularPosts: GroupPost[] = (posts || []).filter(p => p.post_type !== 'poll') as GroupPost[]
  const pollPosts: GroupPost[] = (posts || []).filter(p => p.post_type === 'poll') as GroupPost[]

  return (
    <main className="min-h-screen bg-[#121113]">
      <GroupDetailClient
        group={group}
        initialIsMember={is_member}
        posts={posts}
        polls={polls}
        events={eventsWithData}
        userVotes={userVotes}
      />
    </main>
  )
}
