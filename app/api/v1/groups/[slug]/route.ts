import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
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

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Fetch posts
    const { data: posts } = await db
      .from('group_posts')
      .select('*')
      .eq('group_id', group.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    // Split posts by type
    const announcements = (posts ?? []).filter(p => p.post_type === 'announcement')
    const updates = (posts ?? []).filter(p => p.post_type === 'update')

    // Fetch polls for poll-type posts
    const pollPostIds = (posts || [])
      .filter(p => p.post_type === 'poll')
      .map(p => p.id)

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

    // Fetch active pitches
    const { data: pitches } = await db
      .from('event_pitches')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

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
    const { data: relatedGroups } = await db
      .from('groups')
      .select('id, slug, name, tagline, card_image_url, accent_color, member_count')
      .eq('category', group.category)
      .neq('id', group.id)
      .eq('is_active', true)
      .limit(3)

    // Check membership and poll votes for authenticated user
    let is_member = false
    let userVotes: Record<string, string> = {}

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
    }

    const pollsWithVotes = polls.map(p => ({ ...p, user_vote: userVotes[p.id] ?? null }))

    const eventsWithData = (events || []).map(e => ({
      ...e,
      venue_name: e.venues?.name || null,
      venue_address: e.venues?.address || null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        group,
        announcements,
        updates,
        polls: pollsWithVotes,
        events: eventsWithData,
        pitches: pitches ?? [],
        spotlight: spotlight ?? null,
        organizers: organizers ?? [],
        members: members || [],
        relatedGroups: relatedGroups || [],
        is_member,
        userVotes,
      },
    })
  } catch (error: any) {
    console.error('Error fetching group detail:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch group' }, { status: 500 })
  }
}
