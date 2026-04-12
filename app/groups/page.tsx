import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { GroupGrid } from '@/components/groups/GroupGrid'
import { GroupWithMembership } from '@/types/groups'

export const metadata: Metadata = {
  title: 'Groups | RTNY',
  description: 'Find your Rochester scene',
}

export default async function GroupsPage() {
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  let groupsWithMembership: GroupWithMembership[] = groups || []

  if (user && groups && groups.length > 0) {
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id)

    const memberGroupIds = new Set((memberships || []).map(m => m.group_id))
    groupsWithMembership = groups.map(g => ({
      ...g,
      is_member: memberGroupIds.has(g.id),
    }))
  }

  // Fetch organizers
  const { data: organizerRows } = await supabase
    .from('group_organizers')
    .select('group_id, promoter_id')

  const organizers: { display_name: string; group_name: string; group_slug: string; accent_color: string }[] = []

  if (organizerRows && organizerRows.length > 0) {
    const promoterIds = [...new Set(organizerRows.map(r => r.promoter_id))]
    const groupIds = [...new Set(organizerRows.map(r => r.group_id))]

    const { data: promoters } = await supabase
      .from('promoters')
      .select('id, display_name')
      .in('id', promoterIds)

    const { data: orgGroups } = await supabase
      .from('groups')
      .select('id, name, slug, accent_color')
      .in('id', groupIds)

    const promoterById = Object.fromEntries((promoters || []).map(p => [p.id, p.display_name]))
    const groupById = Object.fromEntries((orgGroups || []).map(g => [g.id, g]))

    for (const row of organizerRows) {
      const promoterName = promoterById[row.promoter_id]
      const group = groupById[row.group_id]
      if (promoterName && group) {
        organizers.push({
          display_name: promoterName,
          group_name: group.name,
          group_slug: group.slug,
          accent_color: group.accent_color,
        })
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#121113]">
      <GroupGrid
        groups={groupsWithMembership}
        organizers={organizers}
        accessToken={session?.access_token}
      />
    </main>
  )
}
