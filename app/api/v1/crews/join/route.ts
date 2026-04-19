import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { Database } from '@/types/database'

type CrewMemberRow = Database['public']['Tables']['crew_members']['Row']

// ─── POST /api/v1/crews/join ─────────────────────────────────────────────────

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

    const { invite_code } = body as { invite_code: unknown }

    if (!invite_code || typeof invite_code !== 'string' || !invite_code.trim()) {
      return NextResponse.json(
        { success: false, error: 'invite_code is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // Look up crew by invite code, include current members for capacity check
    const { data: crew, error: lookupError } = await supabase
      .from('crews')
      .select('*, crew_members(*)')
      .eq('invite_code', invite_code.trim().toUpperCase())
      .single()

    if (lookupError || !crew) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    const members: CrewMemberRow[] = crew.crew_members ?? []

    // Already a member?
    if (members.some(m => m.user_id === user.id)) {
      return NextResponse.json(
        { success: false, error: 'Already a member of this crew' },
        { status: 409 }
      )
    }

    // Crew full?
    if (crew.max_members != null && members.length >= crew.max_members) {
      return NextResponse.json(
        { success: false, error: 'Crew is full' },
        { status: 409 }
      )
    }

    // Join
    const { error: joinError } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: user.id, role: 'member' })

    if (joinError) {
      console.error('Join crew error:', joinError)
      return NextResponse.json(
        { success: false, error: 'Failed to join crew' },
        { status: 500 }
      )
    }

    // Return the crew row without nested members array
    const { crew_members: _members, ...crewData } = crew

    return NextResponse.json({ success: true, data: { crew: crewData } })
  } catch (err) {
    console.error('POST /api/v1/crews/join error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
