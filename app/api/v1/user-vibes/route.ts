import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServer()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error } = await supabase
      .from('user_vibes')
      .select('vibe_tags, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('user_vibes lookup error:', error)
      return NextResponse.json({ error: 'Failed to load vibes' }, { status: 500 })
    }

    // No row is the normal "no vibes set yet" state, not an error.
    if (!existing) {
      return NextResponse.json({ vibe_tags: null, updated_at: null })
    }

    return NextResponse.json({ vibe_tags: existing.vibe_tags, updated_at: existing.updated_at })
  } catch (err) {
    console.error('user-vibes GET route error:', err)
    return NextResponse.json({ error: 'Failed to load vibes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const vibeTags = body.vibe_tags

    if (
      !Array.isArray(vibeTags) ||
      vibeTags.length < 1 ||
      vibeTags.length > 3 ||
      !vibeTags.every((tag) => typeof tag === 'string')
    ) {
      return NextResponse.json({ error: 'Select 1 to 3 vibes' }, { status: 400 })
    }

    // Server-side membership check — never trust client-only validation of the tag list.
    const { data: matchedTags, error: tagsError } = await supabase
      .from('vibe_tags')
      .select('slug')
      .eq('is_active', true)
      .in('slug', vibeTags)

    if (tagsError) {
      console.error('vibe_tags validation error:', tagsError)
      return NextResponse.json({ error: 'Failed to save vibes' }, { status: 500 })
    }

    const validSlugs = new Set((matchedTags ?? []).map((t) => t.slug))
    const allValid = vibeTags.every((slug: string) => validSlugs.has(slug))
    if (!allValid) {
      return NextResponse.json({ error: 'One or more selected vibes are invalid' }, { status: 400 })
    }

    // user_id's uniqueness on user_vibes isn't confirmed (no migration history, id is the
    // stated primary key), so select-then-branch instead of assuming .upsert(onConflict) is safe.
    const { data: existing, error: existingError } = await supabase
      .from('user_vibes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('user_vibes lookup error:', existingError)
      return NextResponse.json({ error: 'Failed to save vibes' }, { status: 500 })
    }

    const now = new Date().toISOString()

    const { data: saved, error: saveError } = existing
      ? await supabase
          .from('user_vibes')
          .update({ vibe_tags: vibeTags, updated_at: now })
          .eq('id', existing.id)
          .select('vibe_tags, updated_at')
          .single()
      : await supabase
          .from('user_vibes')
          .insert({ user_id: user.id, vibe_tags: vibeTags, updated_at: now })
          .select('vibe_tags, updated_at')
          .single()

    if (saveError) {
      console.error('user_vibes save error:', saveError)
      return NextResponse.json({ error: 'Failed to save vibes' }, { status: 500 })
    }

    return NextResponse.json({ vibe_tags: saved.vibe_tags, updated_at: saved.updated_at })
  } catch (err) {
    console.error('user-vibes POST route error:', err)
    return NextResponse.json({ error: 'Failed to save vibes' }, { status: 500 })
  }
}
