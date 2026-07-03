import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── PATCH /api/v1/crews/[id]/avatar ──────────────────────────────────────────
// Captain-only: sets crews.avatar_url to an existing crew_stickers.image_url

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: crewId } = await params

    const body = await request.json().catch(() => null)
    const stickerId = body?.stickerId
    if (typeof stickerId !== 'string') {
      return NextResponse.json({ success: false, error: 'stickerId is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('id, created_by')
      .eq('id', crewId)
      .single()

    if (crewError || !crew) {
      return NextResponse.json({ success: false, error: 'Crew not found' }, { status: 404 })
    }

    if (crew.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the crew captain can set the crew avatar' },
        { status: 403 }
      )
    }

    // Re-verify the sticker actually belongs to this crew — don't trust the client's image_url
    const { data: sticker, error: stickerError } = await supabase
      .from('crew_stickers')
      .select('id, image_url, crew_id')
      .eq('id', stickerId)
      .single()

    if (stickerError || !sticker || sticker.crew_id !== crewId) {
      return NextResponse.json({ success: false, error: 'Sticker not found for this crew' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('crews')
      .update({ avatar_url: sticker.image_url } as any)
      .eq('id', crewId)

    if (updateError) {
      console.error('Update crew avatar error:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { avatar_url: sticker.image_url } })
  } catch (err) {
    console.error('PATCH /api/v1/crews/[id]/avatar error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
