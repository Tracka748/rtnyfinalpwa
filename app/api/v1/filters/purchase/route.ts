import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

// Maps the exact RAISE EXCEPTION text from spend_points_for_filter()
// (supabase/migrations/20260724000002_camera_filters.sql) to an HTTP status.
// Matchers run in order; the first match wins.
const RPC_ERROR_STATUS: { match: (message: string) => boolean; status: number }[] = [
  { match: (m) => m === 'Not authorized to spend points for another user', status: 403 },
  { match: (m) => m.includes('not found'), status: 404 }, // "Filter <id> not found" / "No rewards account found for user <id>"
  { match: (m) => m === 'Filter is not active', status: 410 },
  { match: (m) => m === 'Filter unlock window has closed', status: 410 },
  { match: (m) => m === 'Filter already unlocked by this user', status: 409 },
  { match: (m) => m === 'Insufficient points balance', status: 402 },
]

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createSupabaseServer()

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const filterId = body.filter_id

    if (!filterId || typeof filterId !== 'string') {
      return NextResponse.json({ error: 'filter_id is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: unlock, error } = await supabase
      .rpc('spend_points_for_filter', {
        p_user_id: user.id,
        p_filter_id: filterId,
      })
      .single()

    if (error) {
      const message = error.message ?? ''
      const mapped = RPC_ERROR_STATUS.find((m) => m.match(message))

      if (mapped) {
        return NextResponse.json({ error: message }, { status: mapped.status })
      }

      console.error('spend_points_for_filter RPC error:', error)
      return NextResponse.json({ error: 'Failed to purchase filter' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: unlock })
  } catch (err) {
    console.error('filters/purchase POST error:', err)
    return NextResponse.json({ error: 'Failed to purchase filter' }, { status: 500 })
  }
}
