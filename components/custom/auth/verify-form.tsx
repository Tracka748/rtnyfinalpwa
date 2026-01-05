"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function VerifyForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('verifyEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    } else {
      // No email found, redirect back to login
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      // Clear stored email
      sessionStorage.removeItem('verifyEmail')

      // Redirect to dashboard and force refresh to update nav
      router.push('/dashboard')
      router.refresh()
      
      // Force full page reload to ensure auth state updates
      window.location.href = '/dashboard'

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code')
      }

      alert('New verification code sent!')

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
          We sent a 6-digit code to
        </p>
        <p className="mt-1 font-[family-name:var(--font-rubik)] text-lg font-medium text-[#F9FDFF]">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="code" 
            className="block font-[family-name:var(--font-rubik)] text-sm font-medium text-[#F9FDFF] mb-2"
          >
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            maxLength={6}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-center font-[family-name:var(--font-rubik)] text-2xl tracking-widest text-[#F9FDFF] placeholder-[#666] focus:border-[#59FFA0] focus:outline-none focus:ring-2 focus:ring-[#59FFA0]/20"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="font-[family-name:var(--font-rubik)] text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-[#59FFA0] px-6 py-3 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#121113] border-r-transparent"></div>
              Verifying...
            </span>
          ) : (
            'Verify & Login'
          )}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={loading}
          className="font-[family-name:var(--font-rubik)] text-sm text-[#59FFA0] underline-offset-2 transition-all hover:underline disabled:opacity-50"
        >
          Didn't receive the code? Resend
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => router.push('/login')}
          className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0] underline-offset-2 transition-all hover:text-[#F9FDFF] hover:underline"
        >
          ← Back to login
        </button>
      </div>
    </div>
  )
}