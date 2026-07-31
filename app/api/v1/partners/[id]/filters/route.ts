import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const supabaseServer = await createSupabaseServer()

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [profileResult, partnerResult] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('partners').select('owner_id').eq('id', id).single(),
    ])

    const isAdmin = profileResult.data?.role === 'admin'
    const isOwner = partnerResult.data?.owner_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null
    const eventId = formData.get('event_id') as string | null
    const pointsCostRaw = formData.get('points_cost') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Send a file in the "file" field.' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    if (!isAdmin) {
      const { data: link } = await supabase
        .from('partner_event_links')
        .select('event_id')
        .eq('partner_id', id)
        .eq('event_id', eventId)
        .single()

      if (!link) {
        return NextResponse.json(
          { error: 'This partner is not linked to the specified event.' },
          { status: 403 }
        )
      }
    }

    const pointsCost = Number(pointsCostRaw)
    if (!pointsCostRaw || !Number.isInteger(pointsCost) || pointsCost < 0) {
      return NextResponse.json(
        { error: 'points_cost must be a non-negative integer' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const fileName = `${user.id}-${timestamp}.${fileExt}`
    const filePath = `filters/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-filters')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)

      // Check if bucket doesn't exist
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Storage bucket "event-filters" does not exist. Please create it in Supabase Dashboard → Storage.',
            code: 'BUCKET_NOT_FOUND',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-filters')
      .getPublicUrl(filePath)

    // Insert the filter row
    const { data: filter, error: insertError } = await supabase
      .from('filters')
      .insert({
        event_id: eventId,
        partner_id: id,
        created_by: user.id,
        name,
        asset_url: urlData.publicUrl,
        points_cost: pointsCost,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('filters insert error:', insertError)

      // Roll back the upload so we don't leave an orphaned asset in storage
      const { error: removeError } = await supabase.storage
        .from('event-filters')
        .remove([filePath])

      if (removeError) {
        console.error('Failed to roll back orphaned upload:', removeError)
      }

      return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: filter })
  } catch (err) {
    console.error('partners/[id]/filters POST error:', err)
    return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 })
  }
}
