// app/api/v1/ads/route.ts
// Returns a single ad for a given placement, chosen via weighted-random selection

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const placementKey = request.nextUrl.searchParams.get('placement')

    if (!placementKey) {
      return NextResponse.json({ error: 'placement is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()

    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, image_url, video_url, ad_type, link_url, title, weight, reel_duration_key')
      .eq('placement_key', placementKey)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)

    if (error) {
      console.error('ads GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 })
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ ad: null })
    }

    const totalWeight = ads.reduce((sum, ad) => sum + ad.weight, 0)
    let roll = Math.random() * totalWeight
    let chosen = ads[ads.length - 1]

    for (const ad of ads) {
      if (roll < ad.weight) {
        chosen = ad
        break
      }
      roll -= ad.weight
    }

    // Reel tier -> minimum on-screen seconds. Separate query, mapped in JS (no joins).
    let minSeconds: number | null = null
    if (chosen.ad_type === 'reel' && chosen.reel_duration_key) {
      const { data: tiers, error: tiersError } = await supabase
        .from('ad_reel_duration_options')
        .select('key, min_seconds')

      if (tiersError) {
        console.error('ads GET reel duration options error:', tiersError)
      } else {
        const minSecondsByKey = new Map<string, number | null>(
          (tiers ?? []).map((t) => [t.key as string, (t.min_seconds as number | null) ?? null])
        )
        minSeconds = minSecondsByKey.get(chosen.reel_duration_key) ?? null
      }
    }

    return NextResponse.json({
      ad: {
        id: chosen.id,
        image_url: chosen.image_url,
        video_url: chosen.video_url,
        ad_type: chosen.ad_type,
        link_url: chosen.link_url,
        title: chosen.title,
        minSeconds,
      },
    })
  } catch (err) {
    console.error('ads GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 })
  }
}
