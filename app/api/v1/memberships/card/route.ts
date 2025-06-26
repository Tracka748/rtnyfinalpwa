import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership, error } = await supabase
      .from('memberships')
      .select(
        `
        *,
        profiles!inner(
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const cardData = {
      id: membership.id,
      cardNumber: membership.card_number,
      tier: membership.tier,
      memberSince: membership.created_at,
      name: `${membership.profiles.first_name} ${membership.profiles.last_name}`,
      email: membership.profiles.email,
      qrCode: `RTNY-MEMBER-${membership.card_number}`,
      benefits: getTierBenefits(membership.tier),
    }

    return NextResponse.json({ card: cardData })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTierBenefits(tier: string) {
  const benefits = {
    basic: ['Event access', 'Basic support'],
    promoter: [
      'Event access',
      'Priority support',
      '10% ticket discount',
      'Exclusive events',
    ],
    bottle_girl: [
      'All promoter benefits',
      '15% ticket discount',
      'VIP access',
      'Free merchandise',
    ],
    team: [
      'All benefits',
      '20% ticket discount',
      'Admin access',
      'Revenue sharing',
    ],
  }
  return benefits[tier as keyof typeof benefits] || benefits.basic
}
