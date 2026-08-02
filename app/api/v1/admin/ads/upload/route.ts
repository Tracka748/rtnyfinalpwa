import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${randomUUID()}-${file.name}`

    const supabase = createSupabaseAdmin()

    const { error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(filename, buffer, { contentType: file.type })

    if (uploadError) {
      console.error('admin/ads/upload storage error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data } = supabase.storage.from('ad-images').getPublicUrl(filename)

    return NextResponse.json({ image_url: data.publicUrl })
  } catch (err) {
    console.error('admin/ads/upload POST error:', err)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
