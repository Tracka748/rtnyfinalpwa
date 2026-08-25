// lib/partner-auth.ts
import { NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

// Shared ownership/admin check for partner-scoped write routes — same pattern
// as app/api/v1/partners/[id]/route.ts's PATCH handler.
export async function checkOwnerOrAdmin(partnerId: string) {
  const supabase = createSupabaseAdmin()
  const supabaseServer = await createSupabaseServer()

  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  }

  const [profileResult, partnerResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('partners').select('owner_id, requires_photo_verified_tags').eq('id', partnerId).single(),
  ])

  if (!partnerResult.data) {
    return { error: NextResponse.json({ error: 'Partner not found' }, { status: 404 }) } as const
  }

  const isAdmin = profileResult.data?.role === 'admin'
  const isOwner = partnerResult.data.owner_id === user.id

  if (!isAdmin && !isOwner) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const
  }

  return { supabase, partner: partnerResult.data } as const
}
