'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

interface JoinGroupButtonProps {
  groupSlug: string
  isMember: boolean
  accentColor: string
  onToggle: () => void
}

export default function JoinGroupButton({ groupSlug, isMember, accentColor, onToggle }: JoinGroupButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const method = isMember ? 'DELETE' : 'POST'
      const endpoint = isMember
        ? `/api/v1/groups/${groupSlug}/leave`
        : `/api/v1/groups/${groupSlug}/join`

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.ok) {
        onToggle()
      }
    } finally {
      setLoading(false)
    }
  }

  if (isMember) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2 rounded-xl text-sm font-semibold font-sans border-2 transition-all disabled:opacity-50"
        style={{ borderColor: accentColor, color: accentColor }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Leaving…
          </span>
        ) : (
          '✓ Member'
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-5 py-2 rounded-xl text-sm font-semibold font-sans text-[#121113] transition-all disabled:opacity-50 hover:opacity-90"
      style={{ backgroundColor: accentColor }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-[#121113] border-t-transparent rounded-full animate-spin" />
          Joining…
        </span>
      ) : (
        'Join Group'
      )}
    </button>
  )
}
