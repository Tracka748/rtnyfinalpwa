// app/api/v1/auth/session/route.ts
// Checks if user is currently authenticated

import { getCurrentUser } from '@/lib/auth/get-user'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    })

  } catch (error: any) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}