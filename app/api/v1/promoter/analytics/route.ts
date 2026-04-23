import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch approved drafts for this promoter
    const { data: drafts, error: draftsError } = await supabase
      .from('event_drafts')
      .select('id, name, category, event_date, published_event_id')
      .eq('promoter_id', user.id)
      .eq('status', 'approved');

    if (draftsError) {
      console.error('[promoter/analytics] drafts error:', draftsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    const allDrafts = drafts || [];
    const publishedEventIds = allDrafts
      .map(d => d.published_event_id)
      .filter((id): id is string => Boolean(id));

    // 2 & 3. Short-circuit if no published events
    let ticketTypes: {
      event_id: string;
      name: string;
      price: number;
      quantity: number;
      remaining: number;
    }[] = [];

    let orders: {
      id: string;
      event_id: string;
      total_amount: number;
      status: string;
      created_at: string;
    }[] = [];

    if (publishedEventIds.length > 0) {
      // 2. Fetch ticket_types for all published events
      const { data: ttData, error: ttError } = await supabase
        .from('ticket_types')
        .select('event_id, name, price, quantity, remaining')
        .in('event_id', publishedEventIds);

      if (ttError) {
        console.error('[promoter/analytics] ticket_types error:', ttError);
      } else {
        ticketTypes = ttData || [];
      }

      // 3. Fetch completed orders for all published events
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, event_id, total_amount, status, created_at')
        .in('event_id', publishedEventIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('[promoter/analytics] orders error:', ordersError);
      } else {
        orders = ordersData || [];
      }
    }

    // ── JS AGGREGATION ────────────────────────────────────────────────────────

    // Build a map: published_event_id → draft name
    const eventNameMap: Record<string, string> = {};
    allDrafts.forEach(d => {
      if (d.published_event_id) eventNameMap[d.published_event_id] = d.name;
    });

    // totalRevenue
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // totalTicketsSold: sum of (quantity - remaining) across all ticket_types
    const totalTicketsSold = ticketTypes.reduce(
      (sum, tt) => sum + Math.max(0, (tt.quantity || 0) - (tt.remaining || 0)),
      0
    );

    // totalEvents
    const totalEvents = allDrafts.length;

    // revenueByEvent
    const revenueMap: Record<string, { revenue: number; ticketsSold: number }> = {};
    publishedEventIds.forEach(id => {
      revenueMap[id] = { revenue: 0, ticketsSold: 0 };
    });

    orders.forEach(o => {
      if (revenueMap[o.event_id]) {
        revenueMap[o.event_id].revenue += o.total_amount || 0;
      }
    });

    ticketTypes.forEach(tt => {
      if (revenueMap[tt.event_id]) {
        revenueMap[tt.event_id].ticketsSold += Math.max(0, (tt.quantity || 0) - (tt.remaining || 0));
      }
    });

    const revenueByEvent = publishedEventIds.map(eventId => ({
      eventId,
      eventName: eventNameMap[eventId] ?? 'Unknown Event',
      revenue: revenueMap[eventId]?.revenue ?? 0,
      ticketsSold: revenueMap[eventId]?.ticketsSold ?? 0,
    }));

    // recentOrders: last 10 (already sorted desc)
    const recentOrders = orders.slice(0, 10).map(o => ({
      id: o.id,
      eventName: eventNameMap[o.event_id] ?? 'Unknown Event',
      total_amount: o.total_amount,
      created_at: o.created_at,
    }));

    // monthlySales: last 6 months
    const now = new Date();
    const months: { key: string; label: string; revenue: number; tickets: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'short' }),
        revenue: 0,
        tickets: 0,
      });
    }

    orders.forEach(o => {
      const monthKey = o.created_at.slice(0, 7); // 'YYYY-MM'
      const bucket = months.find(m => m.key === monthKey);
      if (bucket) {
        bucket.revenue += o.total_amount || 0;
        bucket.tickets += 1;
      }
    });

    const monthlySales = months.map(({ label, revenue, tickets }) => ({
      month: label,
      revenue,
      tickets,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalTicketsSold,
        totalEvents,
        revenueByEvent,
        recentOrders,
        monthlySales,
      },
    });
  } catch (error) {
    console.error('[promoter/analytics] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
