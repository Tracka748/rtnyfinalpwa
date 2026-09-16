// lib/vibes/validate-tags.ts
// Shared slug validation against the canonical, active vibe_tags vocabulary.
// Never trust a client-submitted tag list — always check it against this before saving.

export async function findInvalidVibeTags(
  supabase: any,
  slugs: string[]
): Promise<{ invalid: string[] } | { error: string }> {
  if (slugs.length === 0) {
    return { invalid: [] }
  }

  const { data: matchedTags, error } = await supabase
    .from('vibe_tags')
    .select('slug')
    .eq('is_active', true)
    .in('slug', slugs)

  if (error) {
    return { error: error.message }
  }

  const validSlugs = new Set((matchedTags ?? []).map((t: { slug: string }) => t.slug))
  const invalid = slugs.filter((slug) => !validSlugs.has(slug))
  return { invalid }
}
