"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        throw new Error(data.error || 'Failed to send verification code')
      }

      // Store email in sessionStorage for verify page
      sessionStorage.setItem('verifyEmail', email)

      // Navigate to verification page
      router.push('/verify')

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div>
        <label 
          htmlFor="email" 
          className="block font-[family-name:var(--font-rubik)] text-sm font-medium text-[#F9FDFF] mb-2"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 font-[family-name:var(--font-rubik)] text-[#F9FDFF] placeholder-[#666] focus:border-[#59FFA0] focus:outline-none focus:ring-2 focus:ring-[#59FFA0]/20"
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
        disabled={loading || !email}
        className="w-full rounded-lg bg-[#59FFA0] px-6 py-3 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#121113] border-r-transparent"></div>
            Sending code...
          </span>
        ) : (
          'Send Verification Code'
        )}
      </button>

      <p className="text-center font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
        We'll send a 6-digit code to your email
      </p>
    </form>
  )
}