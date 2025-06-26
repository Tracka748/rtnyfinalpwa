import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })

    let authResponse

    if (email) {
      authResponse = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })
    } else if (phone) {
      authResponse = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Email or phone required' },
        { status: 400 }
      )
    }

    if (authResponse.error) {
      return NextResponse.json(
        { error: authResponse.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
