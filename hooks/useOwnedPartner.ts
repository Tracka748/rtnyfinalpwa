'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export interface OwnedPartner {
  id: string
  displayName: string
}

// The signed-in user's partner. Uses the oldest owned partner rather than
// .single(), which errors when a user owns more than one.
export function useOwnedPartner() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<OwnedPartner | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error: queryError } = await supabase
        .from('partners')
        .select('id, display_name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (cancelled) return
      if (queryError) {
        console.error('owned partner lookup error:', queryError)
        setError('We couldn’t load your partner profile. Please try again.')
      } else if (data && data.length > 0) {
        setPartner({ id: data[0].id, displayName: data[0].display_name })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  return { loading, partner, error }
}
