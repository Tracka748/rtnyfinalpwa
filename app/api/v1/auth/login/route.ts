// app/api/v1/auth/login/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input using safeParse
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      return NextResponse.json(
        {
          error: 'Invalid email address',
          code: 'INVALID_EMAIL',
          details: formattedErrors,
        },
        { status: 400 }
      )
    }

    const { email } = result.data

    const supabase = await createSupabaseServer()

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return NextResponse.json(
        {
          error: 'Failed to send verification code',
          code: 'AUTH_ERROR',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email,
        messageId: data?.messageId || null,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error during login',
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
