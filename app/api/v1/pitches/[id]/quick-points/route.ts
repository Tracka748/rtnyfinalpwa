import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardPoints, POINT_VALUES } from '@/lib/points'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actions } = await req.json()

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'No actions provided' }, { status: 400 })
    }

    let totalEarned = 0
    let lastResult: Awaited<ReturnType<typeof awardPoints>> | null = null

    for (const action of actions) {
      lastResult = await awardPoints(supabase, user.id, pitchId, action)
      totalEarned += POINT_VALUES[action] ?? 0
    }

    return NextResponse.json({
      success: true,
      points: {
        earned:       totalEarned,
        newTotal:     lastResult?.newTotal ?? 0,
        justUnlocked: lastResult?.justUnlocked ?? false,
        badge:        lastResult?.badge ?? null,
      },
    })
  } catch (error: any) {
    console.error('Error awarding quick points:', error)
    return NextResponse.json({ error: error.message || 'Failed to award points' }, { status: 500 })
  }
}
