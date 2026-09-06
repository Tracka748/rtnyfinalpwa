import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServer()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tags, error } = await supabase
      .from('vibe_tags')
      .select('slug, label, emoji, category')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('vibe_tags GET error:', error)
      return NextResponse.json({ error: 'Failed to load vibe tags' }, { status: 500 })
    }

    return NextResponse.json({ tags: tags ?? [] })
  } catch (err) {
    console.error('vibe-tags GET route error:', err)
    return NextResponse.json({ error: 'Failed to load vibe tags' }, { status: 500 })
  }
}
