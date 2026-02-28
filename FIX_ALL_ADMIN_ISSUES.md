# Fix: Admin Navigation & Functionality Issues

## 🚨 Issues to Fix

### **Working:**
- ✅ Dashboard (stats display correctly)
- ✅ Drafts page (shows data)
- ✅ Applications page (loads)

### **Broken:**
1. ❌ **Event Drafts Approve/Reject buttons** - Error when clicked
2. ❌ **Promoter Applications** - Dashboard says "2 pending" but page shows none
3. ❌ **Admin Orders link** - Error page
4. ❌ **Admin Events link** - Error page (trying `/admin/events` which doesn't exist)
5. ❌ **Admin Settings link** - 404 white page

---

## 🔧 Fix Priority

### **PRIORITY 1: Fix Event Draft Approve/Reject Buttons** (Critical)

The buttons exist but the API endpoints are probably broken or missing.

**Check if these files exist:**
- `/app/api/v1/admin/event-drafts/[id]/approve/route.ts`
- `/app/api/v1/admin/event-drafts/[id]/reject/route.ts`

**If missing, create them:**

**File:** `/app/api/v1/admin/event-drafts/[id]/approve/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    console.log('Approving draft:', id);

    // Step 1: Get the draft data
    const { data: draft, error: fetchError } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !draft) {
      console.error('Draft not found:', fetchError);
      throw new Error('Draft not found');
    }

    console.log('Draft data:', draft);

    // Step 2: Create the live event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        name: draft.name,
        description: draft.description,
        event_date: draft.event_date,
        venue_id: draft.venue_id,
        venue_name: draft.venue_name,
        venue_address: draft.venue_address,
        category: draft.category,
        flyer_image_url: draft.flyer_image_url,
        total_tickets: draft.total_tickets || 100,
        tickets_sold: 0,
        status: 'active',
        featured: false,
      })
      .select()
      .single();

    if (eventError || !newEvent) {
      console.error('Event creation error:', eventError);
      throw new Error('Failed to create event');
    }

    console.log('Event created:', newEvent.id);

    // Step 3: Create ticket types from ticket_prices JSONB
    if (draft.ticket_prices) {
      const ticketPrices = typeof draft.ticket_prices === 'string' 
        ? JSON.parse(draft.ticket_prices)
        : draft.ticket_prices;

      console.log('Ticket prices:', ticketPrices);

      // Handle both array and object formats
      const ticketEntries = Array.isArray(ticketPrices)
        ? ticketPrices.map(t => [t.name, t.price])
        : Object.entries(ticketPrices);

      for (const [name, price] of ticketEntries) {
        const quantity = Math.floor((draft.total_tickets || 100) / ticketEntries.length);
        
        const { error: ticketError } = await supabase
          .from('ticket_types')
          .insert({
            event_id: newEvent.id,
            name: name,
            price: Number(price),
            quantity: quantity,
            remaining: quantity,
          });

        if (ticketError) {
          console.error('Ticket type creation error:', ticketError);
        } else {
          console.log(`Created ticket type: ${name} - $${price}`);
        }
      }
    }

    // Step 4: Update draft status
    const { error: updateError } = await supabase
      .from('event_drafts')
      .update({
        status: 'approved',
        published_event_id: newEvent.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Draft update error:', updateError);
    }

    console.log('Draft approved successfully');

    return NextResponse.json({
      success: true,
      message: 'Event published successfully',
      event_id: newEvent.id,
    });

  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to approve draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

**File:** `/app/api/v1/admin/event-drafts/[id]/reject/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    console.log('Rejecting draft:', id, 'Reason:', reason);

    // Update draft status to rejected
    const { error } = await supabase
      .from('event_drafts')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'No reason provided',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Reject error:', error);
      throw error;
    }

    console.log('Draft rejected successfully');

    return NextResponse.json({
      success: true,
      message: 'Draft rejected',
    });

  } catch (error) {
    console.error('Reject error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reject draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

---

### **PRIORITY 2: Fix Promoter Applications Empty Page**

**Problem:** Dashboard shows "2 pending" but applications page shows none.

**Root Cause:** Likely the filter or query is wrong.

**File to check:** `/app/admin/promoter-applications/page.tsx`

**Debug the API call:**

Add console logs to see what's happening:

```typescript
async function fetchApplications() {
  try {
    setLoading(true);
    console.log('Fetching applications with filter:', filter);
    
    const response = await fetch(`/api/v1/admin/promoter-applications?status=${filter}`);
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error('Failed to fetch applications');
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.success) {
      console.log('Applications found:', data.data?.length || 0);
      setApplications(data.data || []);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
}
```

**Also check the API route:** `/app/api/v1/admin/promoter-applications/route.ts`

Make sure it's returning data:

```typescript
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    console.log('GET applications - status filter:', status);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('promoter_applications')
      .select('*')
      .order('created_at', { ascending: false });

    // IMPORTANT: Check the actual status value in database
    if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} applications`);
    console.log('First application:', data?.[0]);

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch applications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

**Verify in database:**

Run this in Supabase SQL Editor:

```sql
-- Check what applications exist
SELECT id, business_name, email, status, created_at 
FROM promoter_applications 
ORDER BY created_at DESC;

-- Check pending count
SELECT COUNT(*) 
FROM promoter_applications 
WHERE status = 'pending';
```

---

### **PRIORITY 3: Create Missing Admin Pages**

#### **3A: Admin Events Page**

**File:** `/app/admin/events/page.tsx`

```typescript
'use client';

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-header font-bold text-white mb-2">
          Live Events
        </h1>
        <p className="text-gray-400">
          Manage published events on the platform
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-yellow-300 text-lg font-medium mb-2">
          Coming Soon
        </p>
        <p className="text-sm text-gray-400">
          Live events management page is under development
        </p>
      </div>
    </div>
  );
}
```

---

#### **3B: Admin Orders Page**

**File:** `/app/admin/orders/page.tsx`

```typescript
'use client';

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-header font-bold text-white mb-2">
          Orders
        </h1>
        <p className="text-gray-400">
          View and manage all platform orders
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-yellow-300 text-lg font-medium mb-2">
          Coming Soon
        </p>
        <p className="text-sm text-gray-400">
          Orders management page is under development
        </p>
      </div>
    </div>
  );
}
```

---

#### **3C: Admin Settings Page**

**File:** `/app/admin/settings/page.tsx`

```typescript
'use client';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-header font-bold text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-400">
          Configure platform settings and preferences
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <p className="text-yellow-300 text-lg font-medium mb-2">
          Coming Soon
        </p>
        <p className="text-sm text-gray-400">
          Settings page is under development
        </p>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### **Event Drafts:**
- [ ] Navigate to `/admin/event-drafts`
- [ ] Click "Approve" on a draft
- [ ] Check browser console for errors
- [ ] Verify draft status changes to "approved"
- [ ] Verify new event appears in `events` table
- [ ] Verify ticket types are created

### **Promoter Applications:**
- [ ] Check browser console on applications page
- [ ] Verify API is being called correctly
- [ ] Check if applications exist in database
- [ ] Test "All" filter
- [ ] Test "Pending" filter
- [ ] Verify count matches dashboard

### **Navigation Links:**
- [ ] Click "Events" in sidebar → Should show "Coming Soon" page
- [ ] Click "Orders" in sidebar → Should show "Coming Soon" page
- [ ] Click "Settings" in sidebar → Should show "Coming Soon" page
- [ ] All links should work (no 404s)

---

## 🔍 Debugging Commands

**Check if applications exist:**
```sql
SELECT * FROM promoter_applications WHERE status = 'pending';
```

**Check if drafts exist:**
```sql
SELECT * FROM event_drafts WHERE status = 'pending_review';
```

**Check if approve created event:**
```sql
SELECT * FROM events ORDER BY created_at DESC LIMIT 5;
```

**Check if ticket types were created:**
```sql
SELECT * FROM ticket_types WHERE event_id = 'YOUR_EVENT_ID';
```

---

## ✅ Success Criteria

Admin workflow complete when:
- [ ] Event draft "Approve" button works (creates event + ticket types)
- [ ] Event draft "Reject" button works (updates status)
- [ ] Promoter applications page shows pending applications
- [ ] Dashboard pending count matches applications page
- [ ] All sidebar links work (no 404s)
- [ ] "Coming Soon" pages display for incomplete features
- [ ] Console has no errors

---

## 📋 Implementation Order

**Give to Claude Code:**

```
Fix all broken admin navigation and functionality.

Please create/fix these files:

CRITICAL (Fix approve/reject):
1. /app/api/v1/admin/event-drafts/[id]/approve/route.ts
2. /app/api/v1/admin/event-drafts/[id]/reject/route.ts

HIGH PRIORITY (Fix empty applications):
3. Debug /app/api/v1/admin/promoter-applications/route.ts
4. Add console logs to find why no data shows

MEDIUM (Create placeholder pages):
5. /app/admin/events/page.tsx
6. /app/admin/orders/page.tsx  
7. /app/admin/settings/page.tsx

All pages should have proper error handling and loading states.
```

---

**Time Estimate:** 2-3 hours to fix everything
**Priority:** Fix approve/reject first, then debug applications, then placeholders
