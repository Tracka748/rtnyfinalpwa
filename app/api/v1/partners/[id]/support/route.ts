import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: true, data: { is_supporting: false } })
  }

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase
    .from('partner_supporters')
    .select('id')
    .eq('partner_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('partner_supporters GET error:', error)
    return NextResponse.json({ error: 'Failed to check support status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { is_supporting: data !== null } })
}

export async function POST(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const { error } = await supabase
    .from('partner_supporters')
    .insert({ partner_id: id, user_id: user.id })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already supporting' }, { status: 409 })
    }
    console.error('partner_supporters insert error:', error)
    return NextResponse.json({ error: 'Failed to add support' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Now supporting' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const { error } = await supabase
    .from('partner_supporters')
    .delete()
    .eq('partner_id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('partner_supporters delete error:', error)
    return NextResponse.json({ error: 'Failed to remove support' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Support removed' })
}
