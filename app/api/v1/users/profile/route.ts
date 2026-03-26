// app/api/v1/users/profile/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Two separate queries — no joins
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, neighborhood, age_range, gender, relationship_status, is_parent')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    const { data: vibes } = await supabase
      .from('user_vibes')
      .select('vibe_tags')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        ...(profile ?? {}),
        vibe_tags: vibes?.vibe_tags ?? [],
      },
    })
  } catch (error: any) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { vibe_tags, ...profileFields } = body

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileFields)
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Upsert user_vibes table
    const { error: vibesError } = await supabase
      .from('user_vibes')
      .upsert(
        { user_id: user.id, vibe_tags: vibe_tags ?? [] },
        { onConflict: 'user_id' }
      )

    if (vibesError) {
      console.error('Vibes upsert error:', vibesError)
      return NextResponse.json({ error: vibesError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { ...profileFields, vibe_tags },
    })
  } catch (error: any) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}
