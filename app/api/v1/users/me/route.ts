// app/api/v1/users/me/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user, error } = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          details: error,
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
        },
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error',
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}