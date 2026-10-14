'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export interface OwnedPartner {
  id: string
  displayName: string
}

const LOAD_ERROR = 'We couldn’t load your partner profile. Please try again.'
const NO_ACCESS = 'You don’t have access to this business.'

// The signed-in user's partner. Without a partnerId it uses the oldest owned
// partner rather than .single(), which errors when a user owns more than one.
// With a partnerId it loads exactly that partner, for its owner or an admin,
// and never falls back to another one.
export function useOwnedPartner(partnerId?: string | null) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<OwnedPartner | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setPartner(null)
      setError(null)

      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login')
        return
      }

      if (partnerId) {
        // partners_public_read lets anyone read active rows, so a successful
        // read proves nothing about ownership: check owner, then admin.
        const { data: row, error: rowError } = await supabase
          .from('partners')
          .select('id, display_name, owner_id')
          .eq('id', partnerId)
          .maybeSingle()

        if (cancelled) return
        if (rowError) {
          console.error('partner lookup error:', rowError)
          setError(LOAD_ERROR)
          setLoading(false)
          return
        }

        let allowed = !!row && row.owner_id === user.id
        if (row && !allowed) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

          if (cancelled) return
          if (profileError) console.error('profile role lookup error:', profileError)
          allowed = profile?.role === 'admin'
        }

        if (!row || !allowed) {
          setError(NO_ACCESS)
        } else {
          setPartner({ id: row.id, displayName: row.display_name })
        }
        setLoading(false)
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
        setError(LOAD_ERROR)
      } else if (data && data.length > 0) {
        setPartner({ id: data[0].id, displayName: data[0].display_name })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router, partnerId])

  return { loading, partner, error }
}
