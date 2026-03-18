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

  return (
    <main className="min-h-screen bg-[#121113]">
      <GroupGrid groups={groupsWithMembership} />
    </main>
  )
}
