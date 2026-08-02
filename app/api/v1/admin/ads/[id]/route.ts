import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ad id' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.placement_key !== undefined) {
      if (typeof body.placement_key !== 'string' || !body.placement_key.trim()) {
        return NextResponse.json({ error: 'placement_key must be a non-empty string' }, { status: 400 })
      }
      updates.placement_key = body.placement_key
    }
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
      }
      updates.title = body.title
    }
    if (body.image_url !== undefined) {
      if (typeof body.image_url !== 'string' || !body.image_url.trim()) {
        return NextResponse.json({ error: 'image_url must be a non-empty string' }, { status: 400 })
      }
      updates.image_url = body.image_url
    }
    if (body.link_url !== undefined) updates.link_url = body.link_url
    if (body.weight !== undefined) {
      if (!Number.isInteger(body.weight) || body.weight < 0) {
        return NextResponse.json({ error: 'weight must be a non-negative integer' }, { status: 400 })
      }
      updates.weight = body.weight
    }
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date !== undefined) updates.end_date = body.end_date
    if (body.is_active !== undefined) updates.is_active = body.is_active

    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('ads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('admin/ads/[id] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('admin/ads/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ad id' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { error } = await supabase.from('ads').delete().eq('id', id)

    if (error) {
      console.error('admin/ads/[id] DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin/ads/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 })
  }
}
