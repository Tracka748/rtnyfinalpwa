// app/api/v1/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createSupabaseServer()

    // Sign out the user
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase logout error:', error)
      return NextResponse.json(
        {
          error: 'Failed to logout',
          code: 'LOGOUT_ERROR',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error during logout',
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}