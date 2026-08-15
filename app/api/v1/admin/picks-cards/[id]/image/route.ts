import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid picks card id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'file is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds 5MB limit', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${randomUUID()}-${file.name}`

    const supabase = createSupabaseAdmin()

    const { error: uploadError } = await supabase.storage
      .from('picks-card-images')
      .upload(filename, buffer, { contentType: file.type })

    if (uploadError) {
      console.error('admin/picks-cards/[id]/image storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image', code: 'STORAGE_ERROR' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage.from('picks-card-images').getPublicUrl(filename)

    const { data: card, error: updateError } = await supabase
      .from('picks_cards')
      .update({ background_image_url: publicUrlData.publicUrl })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('admin/picks-cards/[id]/image update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update picks card with image', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: card })
  } catch (err) {
    console.error('admin/picks-cards/[id]/image POST error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}
