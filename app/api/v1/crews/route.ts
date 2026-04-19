import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  // 6 uppercase hex chars — short enough to share, long enough to be unguessable
  return randomBytes(3).toString('hex').toUpperCase()
}

// ─── POST /api/v1/crews ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { name, description, is_private, max_members } = body as {
      name: unknown
      description: unknown
      is_private: unknown
      max_members: unknown
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // Insert the crew row
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .insert({
        name:        name.trim(),
        description: typeof description === 'string' ? description : null,
        is_private:  typeof is_private  === 'boolean' ? is_private : false,
        max_members: typeof max_members === 'number'  ? max_members : null,
        created_by:  user.id,
        invite_code: generateInviteCode(),
      })
      .select()
      .single()

    if (crewError || !crew) {
      console.error('Create crew error:', crewError)
      return NextResponse.json(
        { success: false, error: 'Failed to create crew' },
        { status: 500 }
      )
    }

    // Auto-enroll creator as owner member (best-effort; non-fatal on error)
    const { error: memberError } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: user.id, role: 'owner' })

    if (memberError) {
      console.error('Auto-enroll owner error:', memberError)
    }

    return NextResponse.json({ success: true, data: { crew } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/v1/crews error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
