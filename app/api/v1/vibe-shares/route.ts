import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

const DAILY_SHARE_LIMIT = 5
const CAPTION_MAX_LENGTH = 280

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()

    const body = await request.json()
    const { mode, vibe_tags: vibeTags, caption } = body

    if (mode !== 'prompt' && mode !== 'personalized') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    if (
      !Array.isArray(vibeTags) ||
      vibeTags.length < 1 ||
      vibeTags.length > 3 ||
      !vibeTags.every((tag) => typeof tag === 'string')
    ) {
      return NextResponse.json({ error: 'Select 1 to 3 vibes' }, { status: 400 })
    }

    let trimmedCaption: string | null = null
    if (caption !== undefined && caption !== null) {
      if (typeof caption !== 'string') {
        return NextResponse.json({ error: 'Invalid caption' }, { status: 400 })
      }
      trimmedCaption = caption.trim().slice(0, CAPTION_MAX_LENGTH)
    }

    // Server-side membership check — never trust client-only validation of the tag list.
    const { data: matchedTags, error: tagsError } = await supabase
      .from('vibe_tags')
      .select('slug')
      .eq('is_active', true)
      .in('slug', vibeTags)

    if (tagsError) {
      console.error('vibe_tags validation error:', tagsError)
      return NextResponse.json({ error: 'Failed to create vibe share' }, { status: 500 })
    }

    const validSlugs = new Set((matchedTags ?? []).map((t) => t.slug))
    const allValid = vibeTags.every((slug: string) => validSlugs.has(slug))
    if (!allValid) {
      return NextResponse.json({ error: 'One or more selected vibes are invalid' }, { status: 400 })
    }

    // Daily cap: count today's shares (UTC) for this user. Computed here rather than
    // relying on a DB function, per spec.
    const startOfDayUtc = new Date()
    startOfDayUtc.setUTCHours(0, 0, 0, 0)

    const { count, error: countError } = await supabase
      .from('vibe_shares')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDayUtc.toISOString())

    if (countError) {
      console.error('vibe_shares count error:', countError)
      return NextResponse.json({ error: 'Failed to create vibe share' }, { status: 500 })
    }

    if ((count ?? 0) >= DAILY_SHARE_LIMIT) {
      return NextResponse.json(
        { error: 'Daily vibe share limit reached', remaining: 0 },
        { status: 429 }
      )
    }

    const { data: created, error: insertError } = await supabase
      .from('vibe_shares')
      .insert({
        user_id: user.id,
        mode,
        vibe_tags: vibeTags,
        caption: trimmedCaption,
      })
      .select('id, mode, vibe_tags, caption, created_at')
      .single()

    if (insertError) {
      console.error('vibe_shares insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create vibe share' }, { status: 500 })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('vibe-shares POST route error:', err)
    return NextResponse.json({ error: 'Failed to create vibe share' }, { status: 500 })
  }
}
