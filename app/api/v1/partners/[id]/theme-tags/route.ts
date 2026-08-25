import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

// GET /api/v1/partners/[id]/theme-tags - public, approved tags only
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('partner_theme_tags')
      .select('id, theme_id, status, first_approved_at, themes(name)')
      .eq('partner_id', id)
      .eq('status', 'approved')

    if (error) {
      console.error('partner_theme_tags fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch theme tags' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('theme-tags GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Shared ownership/admin check for POST and DELETE — same pattern as
// app/api/v1/partners/[id]/route.ts's PATCH handler.
async function checkOwnerOrAdmin(partnerId: string) {
  const supabase = createSupabaseAdmin()
  const supabaseServer = await createSupabaseServer()

  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  }

  const [profileResult, partnerResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('partners').select('owner_id, requires_photo_verified_tags').eq('id', partnerId).single(),
  ])

  if (!partnerResult.data) {
    return { error: NextResponse.json({ error: 'Partner not found' }, { status: 404 }) } as const
  }

  const isAdmin = profileResult.data?.role === 'admin'
  const isOwner = partnerResult.data.owner_id === user.id

  if (!isAdmin && !isOwner) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const
  }

  return { supabase, partner: partnerResult.data } as const
}

// POST /api/v1/partners/[id]/theme-tags - self-select tag (no photo required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await checkOwnerOrAdmin(id)
    if ('error' in auth) return auth.error
    const { supabase, partner } = auth

    const body = await request.json()
    const themeId = body.theme_id
    if (!themeId) {
      return NextResponse.json({ error: 'theme_id is required' }, { status: 400 })
    }

    if (partner.requires_photo_verified_tags) {
      return NextResponse.json(
        { error: 'This partner type requires photo verification — theme tags must be submitted with a photo' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('partner_theme_tags')
      .insert({
        partner_id: id,
        theme_id: themeId,
        status: 'approved',
        first_approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This theme is already tagged for this partner' }, { status: 409 })
      }
      console.error('partner_theme_tags insert error:', error)
      return NextResponse.json({ error: 'Failed to add theme tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('theme-tags POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/v1/partners/[id]/theme-tags?theme_id=... - self-select untag only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await checkOwnerOrAdmin(id)
    if ('error' in auth) return auth.error
    const { supabase } = auth

    const { searchParams } = new URL(request.url)
    const themeId = searchParams.get('theme_id')
    if (!themeId) {
      return NextResponse.json({ error: 'theme_id query param is required' }, { status: 400 })
    }

    const { data: tag, error: fetchError } = await supabase
      .from('partner_theme_tags')
      .select('id')
      .eq('partner_id', id)
      .eq('theme_id', themeId)
      .single()

    if (fetchError || !tag) {
      return NextResponse.json({ error: 'Theme tag not found' }, { status: 404 })
    }

    const { data: photoRows, error: photoError } = await supabase
      .from('partner_media')
      .select('id')
      .eq('theme_tag_id', tag.id)
      .limit(1)

    if (photoError) {
      console.error('partner_media check error:', photoError)
      return NextResponse.json({ error: 'Failed to verify theme tag' }, { status: 500 })
    }

    if (photoRows && photoRows.length > 0) {
      return NextResponse.json(
        { error: 'This theme tag has a photo attached and cannot be removed here — contact an admin' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('partner_theme_tags')
      .delete()
      .eq('id', tag.id)

    if (deleteError) {
      console.error('partner_theme_tags delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove theme tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('theme-tags DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
