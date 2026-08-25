import { NextRequest, NextResponse } from 'next/server'
import { checkOwnerOrAdmin } from '@/lib/partner-auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

// POST /api/v1/partners/[id]/theme-tags/photo - photo-proof tag submission,
// for partners with requires_photo_verified_tags = true. Finds or creates a
// pending partner_theme_tags row, uploads the photo, and attaches it as a
// pending partner_media row. Stays pending until an admin approves a photo.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await checkOwnerOrAdmin(id)
    if ('error' in auth) return auth.error
    const { supabase, partner } = auth

    if (!partner.requires_photo_verified_tags) {
      return NextResponse.json(
        { error: 'This partner type does not require photo verification — use the self-select theme tag endpoint instead' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const themeId = formData.get('theme_id')

    if (typeof themeId !== 'string' || !themeId) {
      return NextResponse.json({ error: 'theme_id is required' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send a file in the "file" field.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB` },
        { status: 400 }
      )
    }

    let { data: tag, error: tagFetchError } = await supabase
      .from('partner_theme_tags')
      .select('id, status')
      .eq('partner_id', id)
      .eq('theme_id', themeId)
      .single()

    if (tagFetchError && tagFetchError.code !== 'PGRST116') {
      console.error('partner_theme_tags fetch error:', tagFetchError)
      return NextResponse.json({ error: 'Failed to look up theme tag' }, { status: 500 })
    }

    if (!tag) {
      const { data: newTag, error: tagInsertError } = await supabase
        .from('partner_theme_tags')
        .insert({ partner_id: id, theme_id: themeId, status: 'pending' })
        .select('id, status')
        .single()

      if (tagInsertError || !newTag) {
        console.error('partner_theme_tags insert error:', tagInsertError)
        return NextResponse.json({ error: 'Failed to create theme tag' }, { status: 500 })
      }
      tag = newTag
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${id}/${themeId}-${Date.now()}.${fileExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('partner-theme-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('partner-theme-photos upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo', details: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('partner-theme-photos')
      .getPublicUrl(filePath)

    const { data: media, error: mediaError } = await supabase
      .from('partner_media')
      .insert({
        partner_id: id,
        url: urlData.publicUrl,
        media_type: 'image',
        theme_tag_id: tag.id,
        photo_review_status: 'pending',
      })
      .select()
      .single()

    if (mediaError) {
      console.error('partner_media insert error:', mediaError)
      return NextResponse.json({ error: 'Failed to attach photo to theme tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { tag, media } })
  } catch (err) {
    console.error('theme-tags/photo POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
