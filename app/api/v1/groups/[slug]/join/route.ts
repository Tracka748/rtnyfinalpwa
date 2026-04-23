import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createSupabaseAdmin()

    const { data: group, error: groupError } = await db
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { error } = await db
      .from('group_memberships')
      .upsert(
        { group_id: group.id, user_id: user.id },
        { onConflict: 'group_id,user_id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('Join error:', error)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Joined group' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to join group' }, { status: 500 })
  }
}
