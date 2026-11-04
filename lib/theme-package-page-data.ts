import { cache } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase'
import { loadLiveDocument, resolveLivePackage } from '@/lib/theme-package-public-api'
import { isSlugKey } from '@/lib/theme-package-public-validation'
import type { LiveDocument } from '@/lib/theme-package-public'

/** The live document for a key, or null when it is not live. Shared by the page and its metadata. */
export const getLiveDocument = cache(async (key: string): Promise<LiveDocument | null> => {
  if (!isSlugKey(key)) return null
  const supabase = createSupabaseAdmin()
  const live = await resolveLivePackage(supabase, key)
  return live ? loadLiveDocument(supabase, live) : null
})
