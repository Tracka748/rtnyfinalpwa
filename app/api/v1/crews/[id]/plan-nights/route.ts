import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/[id]/plan-nights ────────────────────────────────────
// Lists saved plan nights for this crew (any member can view).

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: crewId } = await params
    const supabase = createSupabaseAdmin()

    const { data: membership } = await supabase
      .from('crew_members')
      .select('id')
      .eq('crew_id', crewId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'NOT_CREW_MEMBER' },
        { status: 403 }
      )
    }

    const { data: plans, error: plansError } = await supabase
      .from('crew_plan_nights')
      .select('id, name, description, created_at')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })

    if (plansError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch plans' },
        { status: 500 }
      )
    }

    const planIds = (plans ?? []).map((p: any) => p.id)

    const { data: planEvents, error: eventsError } = planIds.length > 0
      ? await supabase
          .from('crew_plan_events')
          .select('plan_night_id')
          .in('plan_night_id', planIds)
      : { data: [] as any[], error: null }

    if (eventsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch plan events' },
        { status: 500 }
      )
    }

    const countByPlan = new Map<string, number>()
    for (const row of planEvents ?? []) {
      countByPlan.set(row.plan_night_id, (countByPlan.get(row.plan_night_id) ?? 0) + 1)
    }

    const result = (plans ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      event_count: countByPlan.get(p.id) ?? 0,
    }))

    return NextResponse.json({ success: true, plans: result })
  } catch (err) {
    console.error('GET /api/v1/crews/[id]/plan-nights error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST /api/v1/crews/[id]/plan-nights ───────────────────────────────────
// Captain-only. Creates one crew_plan_nights row plus one crew_plan_events
// row per selected event, in selection order.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: crewId } = await params
    const supabase = createSupabaseAdmin()

    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('id, created_by')
      .eq('id', crewId)
      .single()

    if (crewError || !crew) {
      return NextResponse.json(
        { success: false, error: 'Crew not found' },
        { status: 404 }
      )
    }

    // Server-side captain check — never trust the client for this.
    if (crew.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the crew captain can create a plan night' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { name, description, events } = body as {
      name: unknown
      description: unknown
      events: unknown
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    let eventList: { event_id: string; bundle_id: string | null }[] = []
    if (events !== undefined) {
      if (!Array.isArray(events)) {
        return NextResponse.json(
          { success: false, error: 'events must be an array' },
          { status: 400 }
        )
      }
      for (const e of events) {
        if (!e || typeof e !== 'object' || typeof (e as any).event_id !== 'string') {
          return NextResponse.json(
            { success: false, error: 'each event must have a string event_id' },
            { status: 400 }
          )
        }
        const bundleId = (e as any).bundle_id
        eventList.push({
          event_id: (e as any).event_id,
          bundle_id: typeof bundleId === 'string' ? bundleId : null,
        })
      }
    }

    const { data: plan, error: planError } = await supabase
      .from('crew_plan_nights')
      .insert({
        crew_id: crewId,
        captain_id: user.id,
        name: name.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
      } as any)
      .select('id, name, description, created_at')
      .single()

    if (planError || !plan) {
      console.error('Create plan night error:', planError)
      return NextResponse.json(
        { success: false, error: 'Failed to create plan night' },
        { status: 500 }
      )
    }

    if (eventList.length > 0) {
      const rows = eventList.map((e, i) => ({
        plan_night_id: plan.id,
        event_id: e.event_id,
        bundle_id: e.bundle_id,
        sequence_order: i + 1,
      }))

      const { error: insertEventsError } = await supabase
        .from('crew_plan_events')
        .insert(rows as any)

      if (insertEventsError) {
        console.error('Create plan events error:', insertEventsError)
        // Roll back the plan night so we don't leave an orphaned empty plan.
        await supabase.from('crew_plan_nights').delete().eq('id', plan.id)
        return NextResponse.json(
          { success: false, error: 'Failed to save plan events' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          created_at: plan.created_at,
          event_count: eventList.length,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/v1/crews/[id]/plan-nights error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
