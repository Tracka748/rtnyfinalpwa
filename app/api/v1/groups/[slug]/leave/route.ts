import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(
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
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Leave error:', error)
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Left group' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to leave group' }, { status: 500 })
  }
}
