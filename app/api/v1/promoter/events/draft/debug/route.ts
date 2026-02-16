import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all drafts for this user
    const { data: drafts, error } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('promoter_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analyze each draft for potential issues
    const analysis = (drafts || []).map((draft) => {
      const issues: string[] = []

      // Check ticket_prices
      if (draft.ticket_prices) {
        try {
          const priceKeys = Object.keys(draft.ticket_prices)
          const priceJsonSize = JSON.stringify(draft.ticket_prices).length

          if (priceKeys.length > 20) {
            issues.push(`ticket_prices has ${priceKeys.length} keys (expected 2-5)`)
          }
          if (priceJsonSize > 5000) {
            issues.push(`ticket_prices JSON is ${priceJsonSize} chars (expected < 1000)`)
          }
        } catch {
          issues.push('ticket_prices is malformed')
        }
      }

      // Check description
      if (draft.description && draft.description.length > 5000) {
        issues.push(`description is ${draft.description.length} chars (very large)`)
      }

      // Check flyer_image_url
      if (draft.flyer_image_url) {
        if (draft.flyer_image_url.startsWith('data:')) {
          issues.push('flyer_image_url contains base64 data (should be URL)')
        }
        if (draft.flyer_image_url.length > 500) {
          issues.push(`flyer_image_url is ${draft.flyer_image_url.length} chars (expected < 200)`)
        }
      }

      // Check tier_discounts
      if (draft.tier_discounts) {
        try {
          const tierJsonSize = JSON.stringify(draft.tier_discounts).length
          if (tierJsonSize > 500) {
            issues.push(`tier_discounts JSON is ${tierJsonSize} chars (expected < 200)`)
          }
        } catch {
          issues.push('tier_discounts is malformed')
        }
      }

      return {
        id: draft.id,
        name: draft.name || 'Untitled',
        status: draft.status,
        created_at: draft.created_at,
        issues: issues.length > 0 ? issues : ['No issues detected'],
        data_sizes: {
          ticket_prices_keys: draft.ticket_prices ? Object.keys(draft.ticket_prices).length : 0,
          ticket_prices_json_bytes: draft.ticket_prices ? JSON.stringify(draft.ticket_prices).length : 0,
          description_chars: draft.description?.length || 0,
          flyer_url_chars: draft.flyer_image_url?.length || 0,
          tier_discounts_json_bytes: draft.tier_discounts ? JSON.stringify(draft.tier_discounts).length : 0,
        },
      }
    })

    const problemDrafts = analysis.filter(a => a.issues.some(i => i !== 'No issues detected'))

    return NextResponse.json({
      success: true,
      total_drafts: drafts?.length || 0,
      healthy_drafts: analysis.length - problemDrafts.length,
      problem_drafts: problemDrafts.length,
      analysis,
      recommendation: problemDrafts.length > 0
        ? `Found ${problemDrafts.length} drafts with issues - see analysis`
        : 'All drafts look healthy',
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
