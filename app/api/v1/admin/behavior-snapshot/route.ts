import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST() {
  try {
    const adminCheck = await checkIsAdmin();
    if (adminCheck.error) return adminCheck.response;

    const supabase = getSupabaseAdmin();

    // Fetch all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, event_id, total_amount, created_at');

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Fetch all events (for purchase_pattern and preferred_event_time)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, event_date');

    if (eventsError) {
      console.error('Events fetch error:', eventsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Build event lookup map
    const eventMap: Record<string, string> = {};
    events?.forEach(e => {
      if (e.id && e.event_date) eventMap[e.id] = e.event_date;
    });

    // Aggregate orders per user
    const userOrdersMap: Record<string, Array<{
      total_amount: number;
      created_at: string;
      event_id: string | null;
    }>> = {};

    orders?.forEach(order => {
      if (!order.user_id) return;
      if (!userOrdersMap[order.user_id]) {
        userOrdersMap[order.user_id] = [];
      }
      userOrdersMap[order.user_id].push({
        total_amount: order.total_amount || 0,
        created_at: order.created_at || '',
        event_id: order.event_id || null,
      });
    });

    const now = new Date().toISOString();
    let usersProcessed = 0;

    for (const [userId, userOrders] of Object.entries(userOrdersMap)) {
      const totalOrders = userOrders.length;

      // avg_spend: average total_amount per order for this user
      const avgSpend =
        totalOrders > 0
          ? userOrders.reduce((sum, o) => sum + o.total_amount, 0) / totalOrders
          : 0;

      // purchase_pattern: compare order created_at to event_date
      const gaps: number[] = [];
      userOrders.forEach(order => {
        if (!order.event_id || !order.created_at) return;
        const eventDate = eventMap[order.event_id];
        if (!eventDate) return;
        const gapMs = new Date(eventDate).getTime() - new Date(order.created_at).getTime();
        if (!isNaN(gapMs)) gaps.push(gapMs);
      });

      let purchasePattern = 'mixed';
      if (gaps.length > 0) {
        const avgGapMs = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const avgGapDays = avgGapMs / (1000 * 60 * 60 * 24);
        if (avgGapDays > 7) {
          purchasePattern = 'advance_buyer';
        } else if (avgGapMs < 1000 * 60 * 60 * 24) {
          purchasePattern = 'last_minute';
        }
      }

      // preferred_event_time: bucket event start hours
      const timeBuckets: Record<string, number> = { daytime: 0, evening: 0, late_night: 0 };
      userOrders.forEach(order => {
        if (!order.event_id) return;
        const eventDate = eventMap[order.event_id];
        if (!eventDate) return;
        const hour = new Date(eventDate).getHours();
        if (hour < 18) timeBuckets.daytime++;
        else if (hour < 22) timeBuckets.evening++;
        else timeBuckets.late_night++;
      });

      let preferredEventTime = 'evening';
      let maxCount = 0;
      for (const [bucket, count] of Object.entries(timeBuckets)) {
        if (count > maxCount) {
          maxCount = count;
          preferredEventTime = bucket;
        }
      }

      // activity_level
      let activityLevel: string;
      if (totalOrders >= 10) activityLevel = 'high';
      else if (totalOrders >= 4) activityLevel = 'medium';
      else if (totalOrders >= 1) activityLevel = 'low';
      else activityLevel = 'dormant';

      const { error: upsertError } = await supabase
        .from('user_behavior_snapshot')
        .upsert(
          {
            user_id: userId,
            avg_spend: Math.round(avgSpend * 100) / 100,
            total_orders: totalOrders,
            purchase_pattern: purchasePattern,
            preferred_event_time: preferredEventTime,
            activity_level: activityLevel,
            last_calculated_at: now,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error(`Upsert failed for user ${userId}:`, upsertError.message);
        continue;
      }

      usersProcessed++;
    }

    return NextResponse.json({
      success: true,
      data: { users_processed: usersProcessed },
    });
  } catch (error) {
    console.error('Behavior snapshot POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
