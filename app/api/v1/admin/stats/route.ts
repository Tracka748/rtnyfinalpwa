import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

// Simple service role client (bypasses RLS for admin queries)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function GET() {
  try {
    const adminCheck = await checkIsAdmin();
    if (adminCheck.error) return adminCheck.response;

    console.log('=== Admin Stats API Called ===');

    const supabase = getSupabaseAdmin();

    // Get current date range
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    // Stat 1: Active Events
    console.log('Fetching active events...');
    const { count: activeEventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    console.log('Active events:', activeEventsCount);

    // Stat 2: Total Tickets Sold
    console.log('Fetching total tickets...');
    const { data: allEvents } = await supabase
      .from('events')
      .select('tickets_sold');
    
    const totalTicketsSold = allEvents?.reduce((sum, event) => sum + (event.tickets_sold || 0), 0) || 0;
    console.log('Total tickets sold:', totalTicketsSold);

    // Stat 3: Tickets Sold Today
    console.log('Fetching today tickets...');
    const { count: ticketsSoldToday } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('purchased_at', todayStart.toISOString());
    console.log('Tickets sold today:', ticketsSoldToday);

    // Stat 4: Revenue (last 30 days)
    console.log('Fetching revenue...');
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'completed');

    const revenue30Days = recentOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    console.log('Revenue 30d:', revenue30Days);

    // Stat 5: Pending Promoter Applications (may not exist yet)
    console.log('Fetching pending applications...');
    const { count: pendingApplications } = await supabase
      .from('promoter_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    console.log('Pending applications:', pendingApplications || 0);

    // Stat 6: Pending Event Drafts
    console.log('Fetching pending drafts...');
    const { count: pendingDrafts } = await supabase
      .from('event_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review');
    console.log('Pending drafts:', pendingDrafts || 0);

    // Sales Trend Data (simple version)
    console.log('Fetching sales trend...');
    const { data: dailySales } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    // Group by day
    const salesByDay: Record<string, any> = {};
    dailySales?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!salesByDay[date]) {
        salesByDay[date] = { date, revenue: 0, count: 0 };
      }
      salesByDay[date].revenue += order.total_amount || 0;
      salesByDay[date].count += 1;
    });

    const salesTrend = Object.values(salesByDay);
    console.log('Sales trend days:', salesTrend.length);

    // Top Events by Revenue
    console.log('Fetching top events...');
    const { data: topEventsRaw } = await supabase
      .from('events')
      .select('id, name, tickets_sold')
      .eq('status', 'active')
      .order('tickets_sold', { ascending: false })
      .limit(5);

    const topEvents = await Promise.all(
      (topEventsRaw || []).map(async (event) => {
        const { data: eventOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('event_id', event.id)
          .eq('status', 'completed');

        const revenue = eventOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        return {
          id: event.id,
          name: event.name,
          tickets_sold: event.tickets_sold || 0,
          revenue,
        };
      })
    );
    console.log('Top events:', topEvents.length);

    // Recent Activity (simple version - just orders, no joins)
    console.log('Fetching recent activity...');
    const { data: recentOrders2 } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, event_id, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get event and user data separately (avoids join issues)
    const eventIds = [...new Set(recentOrders2?.map(o => o.event_id).filter(Boolean) || [])];
    const userIds = [...new Set(recentOrders2?.map(o => o.user_id).filter(Boolean) || [])];

    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds);

    const { data: usersData } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds);

    // Map event and user data to orders
    const recentActivity = recentOrders2?.map(order => ({
      id: order.id,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      events: eventsData?.find(e => e.id === order.event_id) || null,
      users: usersData?.find(u => u.id === order.user_id) || null,
    })) || [];

    console.log('Recent activity orders:', recentActivity.length);
    console.log('=== Stats Fetch Complete ===');

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          activeEvents: activeEventsCount || 0,
          totalTicketsSold,
          ticketsSoldToday: ticketsSoldToday || 0,
          revenue30Days,
          pendingApplications: pendingApplications || 0,
          pendingDrafts: pendingDrafts || 0,
        },
        salesTrend,
        recentActivity,
        topEvents,
      },
    });

  } catch (error) {
    console.error('=== ADMIN STATS API ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Full error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}