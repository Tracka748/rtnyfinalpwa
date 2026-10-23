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
  const [confirmingLeave, setConfirmingLeave] = useState(false)
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
      setConfirmingLeave(false)
    }
  }

  if (isMember) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="px-5 py-2 rounded-xl text-sm font-semibold font-sans border-2"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          ✓ Member
        </span>

        {confirmingLeave ? (
          <span className="flex flex-wrap items-center gap-3 font-sans text-sm text-[#F9FDFF]">
            Leave this group?
            <button
              onClick={handleClick}
              disabled={loading}
              className="font-semibold text-red-400 underline underline-offset-2 transition-colors hover:text-red-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Leaving…
                </span>
              ) : (
                'Yes, leave'
              )}
            </button>
            <button
              onClick={() => setConfirmingLeave(false)}
              disabled={loading}
              className="text-[#F9FDFF]/60 underline underline-offset-2 transition-colors hover:text-[#F9FDFF] disabled:opacity-50"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingLeave(true)}
            className="font-sans text-sm text-[#F9FDFF]/60 underline underline-offset-2 transition-colors hover:text-[#F9FDFF]"
          >
            Leave group
          </button>
        )}
      </div>
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
