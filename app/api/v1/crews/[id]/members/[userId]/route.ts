import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── DELETE /api/v1/crews/[id]/members/[userId] ───────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: crewId, userId: targetUserId } = params

    const supabase = createSupabaseAdmin()

    // Fetch the crew and the requesting user's membership in parallel
    const [
      { data: crew,           error: crewError    },
      { data: requesterMember, error: memberError },
    ] = await Promise.all([
      supabase
        .from('crews')
        .select('id, created_by')
        .eq('id', crewId)
        .single(),
      supabase
        .from('crew_members')
        .select('role')
        .eq('crew_id', crewId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (crewError || !crew) {
      return NextResponse.json(
        { success: false, error: 'Crew not found' },
        { status: 404 }
      )
    }

    // Authorization rules:
    // • A member can remove themselves
    // • The crew owner (created_by) can remove anyone
    // • An admin member can remove anyone except the owner
    const isSelf   = user.id === targetUserId
    const isOwner  = crew.created_by === user.id
    const isAdmin  = requesterMember?.role === 'admin' || requesterMember?.role === 'owner'
    const canAct   = isSelf || isOwner || isAdmin

    if (!canAct) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Prevent the crew owner from removing themselves via this endpoint —
    // they should transfer ownership or delete the crew instead.
    if (isSelf && isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Crew owner cannot leave — transfer ownership or delete the crew first',
        },
        { status: 400 }
      )
    }

    // Perform the removal
    const { error: deleteError } = await supabase
      .from('crew_members')
      .delete()
      .eq('crew_id', crewId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('Remove member error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/v1/crews/[id]/members/[userId] error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
