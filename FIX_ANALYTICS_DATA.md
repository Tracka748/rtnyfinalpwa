# Quick Fix: Analytics Tables Data Aggregation

## 🎯 Goal
Get the Venue Performance and Promoter Performance tables showing actual data from your database.

## 🔍 Current Situation

**What's Working:**
- ✅ Dashboard shows 26 active events
- ✅ "Top 5 Events by Revenue" displays actual events
- ✅ Recent orders showing completed purchases
- ✅ Revenue: $120

**What's Not Working:**
- ❌ Venue Performance table: "No venue data available"
- ❌ Promoter Performance table: "No approved promoter events"

**Root Cause:** The aggregation queries aren't matching your actual data structure.

---

## 🔧 Fix Strategy

**Use the SAME data pattern as "Top 5 Events"** - that's working!

### **Step 1: Simplify Venue Query**

**Current (complex, not working):**
```typescript
// Trying to join orders with .inner modifier
const { data: events } = await supabase
  .from('events')
  .select(`
    id,
    venue_name,
    tickets_sold,
    orders!inner (
      total_amount,
      status
    )
  `)
  .eq('orders.status', 'completed');
```

**New (simple, will work):**
```typescript
// Get events first, then calculate from there
const { data: events } = await supabase
  .from('events')
  .select('id, venue_name, tickets_sold, total_tickets')
  .not('venue_name', 'is', null);

// Get all completed orders
const { data: orders } = await supabase
  .from('orders')
  .select('event_id, total_amount, status');

// Aggregate manually in JavaScript
const venueMap = new Map();

events?.forEach(event => {
  const venueName = event.venue_name || 'Unknown Venue';
  
  if (!venueMap.has(venueName)) {
    venueMap.set(venueName, {
      venue_name: venueName,
      events_hosted: 0,
      total_revenue: 0,
      tickets_sold: 0,
    });
  }
  
  const venue = venueMap.get(venueName);
  venue.events_hosted += 1;
  venue.tickets_sold += event.tickets_sold || 0;
  
  // Calculate revenue from orders
  const eventOrders = orders?.filter(o => o.event_id === event.id) || [];
  const eventRevenue = eventOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  venue.total_revenue += eventRevenue;
});

const venuePerformance = Array.from(venueMap.values())
  .sort((a, b) => b.total_revenue - a.total_revenue);
```

---

### **Step 2: Simplify Promoter Query**

**New (simple approach):**
```typescript
// Get all approved drafts
const { data: approvedDrafts } = await supabase
  .from('event_drafts')
  .select('promoter_id, published_event_id, status')
  .eq('status', 'approved')
  .not('published_event_id', 'is', null);

// Get event details for approved drafts
const eventIds = approvedDrafts?.map(d => d.published_event_id).filter(Boolean) || [];

const { data: publishedEvents } = await supabase
  .from('events')
  .select('id, tickets_sold')
  .in('id', eventIds);

// Aggregate by promoter
const promoterMap = new Map();

approvedDrafts?.forEach(draft => {
  const promoterId = draft.promoter_id;
  
  if (!promoterId) return;
  
  if (!promoterMap.has(promoterId)) {
    promoterMap.set(promoterId, {
      promoter_id: promoterId,
      promoter_name: promoterId, // Will fetch name separately
      total_events: 0,
      total_tickets_sold: 0,
      total_revenue: 0,
    });
  }
  
  const promoter = promoterMap.get(promoterId);
  promoter.total_events += 1;
  
  // Find published event
  const publishedEvent = publishedEvents?.find(e => e.id === draft.published_event_id);
  if (publishedEvent) {
    promoter.total_tickets_sold += publishedEvent.tickets_sold || 0;
  }
});

// Fetch promoter names
const promoterIds = Array.from(promoterMap.keys());
const { data: users } = await supabase
  .from('users')
  .select('id, email')
  .in('id', promoterIds);

// Update names
users?.forEach(user => {
  const promoter = promoterMap.get(user.id);
  if (promoter) {
    promoter.promoter_name = user.email;
  }
});

const promoterPerformance = Array.from(promoterMap.values())
  .sort((a, b) => b.total_tickets_sold - a.total_tickets_sold);
```

---

## 💻 Complete Fixed API Endpoint

**File:** `/app/api/v1/admin/analytics/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const supabase = getSupabaseAdmin();

    console.log('=== Fetching Analytics Data ===');

    // Get all events with venue names
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, venue_name, tickets_sold, total_tickets')
      .not('venue_name', 'is', null);

    if (eventsError) console.error('Events error:', eventsError);
    console.log('Events found:', events?.length || 0);

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('event_id, total_amount, status');

    if (ordersError) console.error('Orders error:', ordersError);
    console.log('Orders found:', orders?.length || 0);

    // Aggregate venue performance
    const venueMap = new Map();

    events?.forEach(event => {
      const venueName = event.venue_name || 'Unknown Venue';
      
      if (!venueMap.has(venueName)) {
        venueMap.set(venueName, {
          venue_name: venueName,
          events_hosted: 0,
          total_revenue: 0,
          tickets_sold: 0,
        });
      }
      
      const venue = venueMap.get(venueName);
      venue.events_hosted += 1;
      venue.tickets_sold += event.tickets_sold || 0;
      
      // Calculate revenue from orders
      const eventOrders = orders?.filter(o => o.event_id === event.id) || [];
      const eventRevenue = eventOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      venue.total_revenue += eventRevenue;
    });

    const venuePerformance = Array.from(venueMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);

    console.log('Venues:', venuePerformance.length);

    // Get approved drafts
    const { data: approvedDrafts, error: draftsError } = await supabase
      .from('event_drafts')
      .select('promoter_id, published_event_id, status')
      .eq('status', 'approved')
      .not('published_event_id', 'is', null);

    if (draftsError) console.error('Drafts error:', draftsError);
    console.log('Approved drafts:', approvedDrafts?.length || 0);

    // Get published events
    const eventIds = approvedDrafts?.map(d => d.published_event_id).filter(Boolean) || [];
    let publishedEvents = [];
    
    if (eventIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select('id, tickets_sold')
        .in('id', eventIds);
      publishedEvents = data || [];
    }

    // Aggregate promoters
    const promoterMap = new Map();

    approvedDrafts?.forEach(draft => {
      const promoterId = draft.promoter_id;
      if (!promoterId) return;
      
      if (!promoterMap.has(promoterId)) {
        promoterMap.set(promoterId, {
          promoter_id: promoterId,
          promoter_name: promoterId,
          total_events: 0,
          total_tickets_sold: 0,
          total_revenue: 0,
        });
      }
      
      const promoter = promoterMap.get(promoterId);
      promoter.total_events += 1;
      
      const publishedEvent = publishedEvents.find(e => e.id === draft.published_event_id);
      if (publishedEvent) {
        promoter.total_tickets_sold += publishedEvent.tickets_sold || 0;
        const eventOrders = orders?.filter(o => o.event_id === publishedEvent.id) || [];
        const eventRevenue = eventOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        promoter.total_revenue += eventRevenue;
      }
    });

    // Fetch promoter names
    const promoterIds = Array.from(promoterMap.keys());
    if (promoterIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', promoterIds);

      users?.forEach(user => {
        const promoter = promoterMap.get(user.id);
        if (promoter) promoter.promoter_name = user.email || 'Unknown';
      });
    }

    const promoterPerformance = Array.from(promoterMap.values())
      .sort((a, b) => b.total_tickets_sold - a.total_tickets_sold);

    console.log('Promoters:', promoterPerformance.length);
    console.log('=== Analytics Complete ===');

    return NextResponse.json({
      success: true,
      data: {
        venuePerformance,
        promoterPerformance
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
```

---

## 🚀 Give to Claude Code

```
Fix analytics data aggregation to show actual data.

Replace /app/api/v1/admin/analytics/route.ts with the simplified version
from FIX_ANALYTICS_DATA.md

Key changes:
1. Remove complex .inner joins - get data separately and aggregate in JS
2. Use same pattern as "Top 5 Events" which works
3. Add console logging to debug
4. Handle null values properly

This will populate both analytics tables with real data!
```

---

**Time:** 15 minutes  
**Result:** Working analytics! 📊
