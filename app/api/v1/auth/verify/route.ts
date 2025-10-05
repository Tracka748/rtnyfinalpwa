// app/api/v1/auth/verify/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema
const verifySchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().length(6, 'Verification code must be 6 digits'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input using safeParse
    const result = verifySchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          code: 'INVALID_INPUT',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { email, token } = result.data
    const supabase = await createSupabaseServer()

    // Verify OTP with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      console.error('Supabase verification error:', error)
      return NextResponse.json(
        {
          error: 'Invalid or expired verification code',
          code: 'VERIFICATION_FAILED',
          details: error.message,
        },
        { status: 401 }
      )
    }

    // Successful verification
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          created_at: data.user?.created_at,
        },
        session: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
          expires_at: data.session?.expires_at,
        },
      },
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error during verification',
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
