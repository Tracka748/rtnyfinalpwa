import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const supabase = await createClient()

    // 1. Require authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Look up group by slug
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const groupId = group.id

    // 3. Verify requesting user is an active member of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membershipError) {
      console.error('Error checking membership:', membershipError)
      return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 })
    }

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    // 4. Fetch all active members
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select('id, user_id, joined_at')
      .eq('group_id', groupId)
      .eq('status', 'active')

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // 5. Fetch profiles for all members
    const userIds = members.map(m => m.user_id)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    const profileById: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
    for (const p of profiles || []) {
      profileById[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }
    }

    // 6. Aggregate
    const result = members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      display_name: profileById[m.user_id]?.display_name ?? null,
      avatar_url: profileById[m.user_id]?.avatar_url ?? null,
      joined_at: m.joined_at,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Error in GET /api/v1/groups/[slug]/members:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 })
  }
}
