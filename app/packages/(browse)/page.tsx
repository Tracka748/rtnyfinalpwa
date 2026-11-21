import type { Metadata } from 'next'
import { PackageBrowse } from '@/components/custom/packages/PackageBrowse'
import { createSupabaseAdmin } from '@/lib/supabase'
import { listLiveCards } from '@/lib/theme-package-public-api'

// Always read the live state: publishing or archiving a package must show up immediately.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Curated Packages | RTNY',
  description: 'Hand-built celebration packages for Rochester. Pick one, reserve it, or make it your own.',
}

export default async function PackagesPage() {
  // A database error throws to app/packages/error.tsx; nothing raw is rendered.
  const first = await listLiveCards(createSupabaseAdmin(), { offset: 0 })
  return (
    <div className="min-h-screen bg-[#121113] text-[#F9FDFF]">
      <PackageBrowse initial={first} />
    </div>
  )
}
