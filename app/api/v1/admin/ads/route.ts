import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

export async function GET() {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const supabase = createSupabaseAdmin()

    const [adsResult, eventsResult] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_events').select('ad_id, event_type'),
    ])

    if (adsResult.error) {
      console.error('admin/ads GET query error:', adsResult.error)
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
    }

    if (eventsResult.error) {
      console.error('admin/ads GET events query error:', eventsResult.error)
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
    }

    const counts = new Map<string, { impressions: number; clicks: number }>()
    for (const event of eventsResult.data ?? []) {
      const entry = counts.get(event.ad_id) ?? { impressions: 0, clicks: 0 }
      if (event.event_type === 'impression') entry.impressions += 1
      if (event.event_type === 'click') entry.clicks += 1
      counts.set(event.ad_id, entry)
    }

    const ads = (adsResult.data ?? []).map((ad) => ({
      ...ad,
      impressions: counts.get(ad.id)?.impressions ?? 0,
      clicks: counts.get(ad.id)?.clicks ?? 0,
    }))

    return NextResponse.json(ads)
  } catch (err) {
    console.error('admin/ads GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const body = await request.json()
    const {
      placement_key, title, image_url, link_url, weight, start_date, end_date, is_active,
      ad_type, video_url, reel_duration_key,
    } = body

    const resolvedAdType = ad_type === undefined ? 'image' : ad_type
    if (resolvedAdType !== 'image' && resolvedAdType !== 'reel') {
      return NextResponse.json({ error: 'ad_type must be "image" or "reel"' }, { status: 400 })
    }

    if (typeof placement_key !== 'string' || !placement_key.trim()) {
      return NextResponse.json({ error: 'placement_key is required' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (resolvedAdType === 'image') {
      if (typeof image_url !== 'string' || !image_url.trim()) {
        return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
      }
    } else {
      if (typeof video_url !== 'string' || !video_url.trim()) {
        return NextResponse.json({ error: 'video_url is required' }, { status: 400 })
      }
    }
    if (weight !== undefined && (!Number.isInteger(weight) || weight < 0)) {
      return NextResponse.json({ error: 'weight must be a non-negative integer' }, { status: 400 })
    }

    const insert: Record<string, unknown> = { placement_key, title, ad_type: resolvedAdType }
    if (resolvedAdType === 'image') {
      insert.image_url = image_url
      insert.video_url = null
      insert.reel_duration_key = null
    } else {
      insert.video_url = video_url
      insert.image_url = null
      insert.reel_duration_key = reel_duration_key ?? null
    }
    if (link_url !== undefined) insert.link_url = link_url
    if (weight !== undefined) insert.weight = weight
    if (start_date !== undefined) insert.start_date = start_date
    if (end_date !== undefined) insert.end_date = end_date
    if (is_active !== undefined) insert.is_active = is_active

    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('ads')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('admin/ads POST insert error:', error)
      return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('admin/ads POST error:', err)
    return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 })
  }
}
