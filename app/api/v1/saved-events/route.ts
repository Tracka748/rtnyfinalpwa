import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const anon = await createClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('saved_events')
    .select('event_id')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data.map((row) => row.event_id) })
}

export async function POST(request: NextRequest) {
  const anon = await createClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { event_id } = await request.json()

  const admin = createSupabaseAdmin()
  const { error } = await admin
    .from('saved_events')
    .insert({ user_id: user.id, event_id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const anon = await createClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { event_id } = await request.json()

  const admin = createSupabaseAdmin()
  const { error } = await admin
    .from('saved_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', event_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
