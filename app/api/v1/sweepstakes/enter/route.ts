import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sweepstakes_id } = body as { sweepstakes_id: string }

    if (!sweepstakes_id) {
      return NextResponse.json({ error: 'sweepstakes_id is required' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('sweepstakes_entries')
      .select('id')
      .eq('sweepstakes_id', sweepstakes_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already entered' }, { status: 409 })
    }

    const { error: insertError } = await supabase
      .from('sweepstakes_entries')
      .insert({ sweepstakes_id, user_id: user.id })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Already entered' }, { status: 409 })
      }
      console.error('Entry insert error:', insertError)
      return NextResponse.json({ error: 'Failed to enter sweepstakes' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error entering sweepstakes:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
