import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

// Same direct service-role client as stats/route.ts (Top 5 Events uses this and works)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const adminCheck = await checkIsAdmin();
    if (adminCheck.error) return adminCheck.response;

    const supabase = getSupabaseAdmin();

    // ── SAME PATTERN AS TOP 5 EVENTS ─────────────────────────────────────────
    // Step 1: fetch active events with venue join (venues.name, not venue_name)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, venue_id, tickets_sold, promoter_id, venues(name)')
      .eq('status', 'active');

    console.log('[analytics] events count:', events?.length, 'error:', eventsError);
    if (events?.length) console.log('[analytics] sample event:', events[0]);

    // Step 2: fetch completed orders (same status as Top 5 Events)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('event_id, total_amount')
      .eq('status', 'completed');

    console.log('[analytics] orders count:', orders?.length, 'error:', ordersError);

    // Build event → revenue lookup
    const eventRevenueMap: Record<string, number> = {};
    orders?.forEach(order => {
      if (order.event_id) {
        eventRevenueMap[order.event_id] =
          (eventRevenueMap[order.event_id] || 0) + (order.total_amount || 0);
      }
    });

    // ── VENUE PERFORMANCE ─────────────────────────────────────────────────────
    // Group events by venue name (from the joined venues table)
    const venueMap: Record<string, {
      venue_name: string;
      events_hosted: number;
      total_revenue: number;
      tickets_sold: number;
    }> = {};

    events?.forEach((event: any) => {
      const venueName = event.venues?.name || 'Unknown Venue';
      if (!venueMap[venueName]) {
        venueMap[venueName] = { venue_name: venueName, events_hosted: 0, total_revenue: 0, tickets_sold: 0 };
      }
      venueMap[venueName].events_hosted += 1;
      venueMap[venueName].tickets_sold += event.tickets_sold || 0;
      venueMap[venueName].total_revenue += eventRevenueMap[event.id] || 0;
    });

    const venuePerformance = Object.values(venueMap)
      .sort((a, b) => b.total_revenue - a.total_revenue);

    console.log('[analytics] venuePerformance count:', venuePerformance.length);

    // ── PROMOTER PERFORMANCE ──────────────────────────────────────────────────
    // events.promoter_id → promoters table (same FK pattern as events → venues)
    const promoterIds = [...new Set(
      events?.map((e: any) => e.promoter_id).filter(Boolean) || []
    )] as string[];

    let promoterPerformance: {
      promoter_id: string;
      promoter_name: string;
      total_events: number;
      total_tickets_sold: number;
      total_revenue: number;
    }[] = [];

    if (promoterIds.length > 0) {
      const { data: promoters } = await supabase
        .from('promoters')
        .select('id, business_name, contact_email')
        .in('id', promoterIds);

      console.log('[analytics] promoters count:', promoters?.length);

      const promoterMap: Record<string, typeof promoterPerformance[number]> = {};

      events?.forEach((event: any) => {
        const pid = event.promoter_id;
        if (!pid) return;
        if (!promoterMap[pid]) {
          const p = promoters?.find(pr => pr.id === pid);
          promoterMap[pid] = {
            promoter_id: pid,
            promoter_name: p?.business_name || p?.contact_email || 'Unknown',
            total_events: 0,
            total_tickets_sold: 0,
            total_revenue: 0,
          };
        }
        promoterMap[pid].total_events += 1;
        promoterMap[pid].total_tickets_sold += event.tickets_sold || 0;
        promoterMap[pid].total_revenue += eventRevenueMap[event.id] || 0;
      });

      promoterPerformance = Object.values(promoterMap)
        .sort((a, b) => b.total_revenue - a.total_revenue);
    }

    console.log('[analytics] promoterPerformance count:', promoterPerformance.length);

    return NextResponse.json({
      success: true,
      data: { venuePerformance, promoterPerformance },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
