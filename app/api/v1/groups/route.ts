import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Fetch all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, slug, name, tagline, description, cover_image_url, card_image_url, accent_color, category, member_count, is_active, sort_order, early_access_hours')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const groupIds = groups.map(g => g.id)

    // 2. Fetch organizers (group_organizers → promoters)
    const { data: organizerRows, error: organizersError } = await supabase
      .from('group_organizers')
      .select('group_id, promoter_id')
      .in('group_id', groupIds)

    if (organizersError) {
      console.error('Error fetching organizers:', organizersError)
    }

    const promoterIds = [...new Set((organizerRows || []).map(r => r.promoter_id))]

    let promoterNameById: Record<string, string> = {}
    if (promoterIds.length > 0) {
      const { data: promoters, error: promotersError } = await supabase
        .from('promoters')
        .select('id, display_name')
        .in('id', promoterIds)

      if (promotersError) {
        console.error('Error fetching promoter names:', promotersError)
      }

      for (const p of promoters || []) {
        promoterNameById[p.id] = p.display_name
      }
    }

    // Map first organizer name per group
    const organizerByGroup: Record<string, string> = {}
    for (const row of organizerRows || []) {
      if (!organizerByGroup[row.group_id]) {
        organizerByGroup[row.group_id] = promoterNameById[row.promoter_id] ?? null
      }
    }

    // 3. Aggregate
    const result = groups.map(g => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      tagline: g.tagline,
      description: g.description,
      cover_image_url: g.cover_image_url,
      card_image_url: g.card_image_url,
      accent_color: g.accent_color,
      category: g.category,
      member_count: g.member_count,
      is_active: g.is_active,
      sort_order: g.sort_order,
      early_access_hours: g.early_access_hours,
      organizer_name: organizerByGroup[g.id] ?? null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Error in GET /api/v1/groups:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch groups' }, { status: 500 })
  }
}
