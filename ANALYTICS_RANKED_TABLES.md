# Admin Analytics Upgrade: Dynamic Ranked Tables

## 🎯 Mission
Replace bar chart visualizations with professional, sortable, data-driven analytics tables for decision-making.

## 🚫 Remove
- Existing bar graph visualization (Revenue vs Tickets chart)
- Any decorative charts that don't provide actionable intelligence

## ✅ Add: Two Dynamic Ranked Tables

---

## 📊 TABLE 1: Venue Performance Overview

### **Purpose**
Show which venues are generating the most revenue and activity for RTNY.

### **Data Requirements**

**Query Logic:**
```typescript
// Get all venues with their performance metrics
const venuePerformance = await supabase
  .from('events')
  .select(`
    venue_id,
    venue_name,
    id,
    orders!inner (
      total_amount,
      status
    )
  `)
  .eq('orders.status', 'completed');

// Aggregate by venue
const aggregatedData = venuePerformance.reduce((acc, event) => {
  const venueName = event.venue_name || 'Unknown Venue';
  
  if (!acc[venueName]) {
    acc[venueName] = {
      venue_name: venueName,
      events_hosted: 0,
      total_revenue: 0,
      tickets_sold: 0
    };
  }
  
  acc[venueName].events_hosted += 1;
  acc[venueName].total_revenue += event.orders?.total_amount || 0;
  // Get tickets sold from tickets table or order_items
  
  return acc;
}, {});

// Convert to array and sort by revenue
const rankedVenues = Object.values(aggregatedData)
  .sort((a, b) => b.total_revenue - a.total_revenue);
```

### **Columns**

| Column | Type | Calculation | Format |
|--------|------|-------------|--------|
| **Rank** | Number | Auto-assigned based on sort | #1, #2, #3... |
| **Venue Name** | String | From `venue_name` | Text |
| **# of Events Hosted** | Number | `COUNT(DISTINCT event_id)` | Integer |
| **Total Revenue** | Currency | `SUM(orders.total_amount WHERE status='completed')` | $X,XXX.XX |
| **Total Tickets Sold** | Number | `COUNT(tickets WHERE status='sold')` | Integer |

### **Features**
- ✅ **Sortable** by any column (click column header)
- ✅ **Searchable** (filter by venue name)
- ✅ **Paginated** (show 10 per page, with pagination controls)
- ✅ **Auto-ranked** (#1, #2, #3 based on Total Revenue)
- ✅ **Live data** (auto-refreshes with dashboard)

### **UI/UX**
- **Top 3 venues** get special badges (🥇🥈🥉)
- **Hover state** on rows
- **Click row** to see venue details (future enhancement)
- **Empty state** if no data

---

## 👥 TABLE 2: Promoter Performance Overview

### **Purpose**
Show which promoters are most active and successful on the platform.

### **Data Requirements**

**Query Logic:**
```typescript
// Get all promoters with their performance metrics
const promoterPerformance = await supabase
  .from('event_drafts')
  .select(`
    promoter_id,
    status,
    published_event_id,
    events!published_event_id (
      id,
      name,
      tickets_sold
    )
  `)
  .eq('status', 'approved');

// Aggregate by promoter
const aggregatedData = promoterPerformance.reduce((acc, draft) => {
  const promoterId = draft.promoter_id;
  
  if (!acc[promoterId]) {
    acc[promoterId] = {
      promoter_id: promoterId,
      promoter_name: 'Loading...', // Fetch from users table
      total_events: 0,
      total_tickets_sold: 0,
      total_revenue: 0
    };
  }
  
  acc[promoterId].total_events += 1;
  acc[promoterId].total_tickets_sold += draft.events?.tickets_sold || 0;
  
  return acc;
}, {});

// Get promoter names
for (const promoter of Object.values(aggregatedData)) {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', promoter.promoter_id)
    .single();
  
  promoter.promoter_name = user?.email || 'Unknown Promoter';
}

// Sort by tickets sold
const rankedPromoters = Object.values(aggregatedData)
  .sort((a, b) => b.total_tickets_sold - a.total_tickets_sold);
```

### **Columns**

| Column | Type | Calculation | Format |
|--------|------|-------------|--------|
| **Rank** | Number | Auto-assigned based on sort | #1, #2, #3... |
| **Promoter Name** | String | From `users.email` or `business_name` | Text |
| **Total Events Created** | Number | `COUNT(event_drafts WHERE status='approved')` | Integer |
| **Total Tickets Sold** | Number | `SUM(events.tickets_sold)` | Integer |
| **Total Revenue** | Currency | `SUM(orders.total_amount)` for their events | $X,XXX.XX |

### **Features**
- ✅ **Sortable** by any column
- ✅ **Searchable** (filter by promoter name)
- ✅ **Paginated** (show 10 per page)
- ✅ **Auto-ranked** (#1, #2, #3 based on Tickets Sold)
- ✅ **Live data** (auto-refreshes with dashboard)

### **UI/UX**
- **Top 3 promoters** get badges (🥇🥈🥉)
- **Color-coded tiers** (Top 10%, Next 20%, etc.)
- **Hover state** on rows
- **Empty state** if no promoters yet

---

## 🎨 Design System (RTNY Dark Theme)

### **Table Container**
```typescript
<div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
  {/* Table content */}
</div>
```

### **Table Header**
```typescript
<thead className="bg-white/5 border-b border-white/10">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400">
      Column Name
    </th>
  </tr>
</thead>
```

### **Table Rows**
```typescript
<tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
  <td className="px-4 py-3 text-sm text-white">
    Data
  </td>
</tr>
```

### **Rank Badges**
```typescript
const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
```

### **Color Scheme**
- **Headers:** Gray-400 text, white/5 background
- **Rows:** White text, hover white/5
- **Borders:** White/10
- **Revenue/Numbers:** Green (#59FFA0) for positive
- **Search:** Blue (#007BFF) border on focus

---

## 💻 Implementation Files

### **Component 1: Venue Performance Table**

**File:** `/components/admin/VenuePerformanceTable.tsx`

```typescript
'use client';

import { useState, useMemo } from 'react';

interface VenuePerformance {
  venue_name: string;
  events_hosted: number;
  total_revenue: number;
  tickets_sold: number;
}

interface VenuePerformanceTableProps {
  data: VenuePerformance[];
}

type SortField = 'venue_name' | 'events_hosted' | 'total_revenue' | 'tickets_sold';
type SortOrder = 'asc' | 'desc';

export function VenuePerformanceTable({ data }: VenuePerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter by search
  const filteredData = useMemo(() => {
    return data.filter(venue =>
      venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginate
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }

  function getRankBadge(index: number) {
    const rank = (currentPage - 1) * itemsPerPage + index + 1;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-400">No venue data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header with Search */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-header font-bold text-white">
          🏢 Venue Performance Overview
        </h3>
        <input
          type="text"
          placeholder="Search venues..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 w-16">
                Rank
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('venue_name')}
              >
                Venue Name {sortField === 'venue_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('events_hosted')}
              >
                Events {sortField === 'events_hosted' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total_revenue')}
              >
                Revenue {sortField === 'total_revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('tickets_sold')}
              >
                Tickets {sortField === 'tickets_sold' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((venue, index) => (
              <tr 
                key={venue.venue_name}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <span className="text-lg">{getRankBadge(index)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {venue.venue_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {venue.events_hosted}
                </td>
                <td className="px-4 py-3 text-sm text-[#59FFA0] font-medium">
                  ${venue.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {venue.tickets_sold.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} venues
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### **Component 2: Promoter Performance Table**

**File:** `/components/admin/PromoterPerformanceTable.tsx`

Use same structure as VenuePerformanceTable but with promoter-specific data.

---

### **API Route: Get Analytics Data**

**File:** `/app/api/v1/admin/analytics/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get venue performance
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

    // Aggregate venue data
    const venueMap = new Map();
    events?.forEach(event => {
      const venue = event.venue_name || 'Unknown Venue';
      if (!venueMap.has(venue)) {
        venueMap.set(venue, {
          venue_name: venue,
          events_hosted: 0,
          total_revenue: 0,
          tickets_sold: 0
        });
      }
      const venueData = venueMap.get(venue);
      venueData.events_hosted += 1;
      venueData.total_revenue += event.orders?.total_amount || 0;
      venueData.tickets_sold += event.tickets_sold || 0;
    });

    const venuePerformance = Array.from(venueMap.values());

    // Get promoter performance
    const { data: drafts } = await supabase
      .from('event_drafts')
      .select(`
        promoter_id,
        status,
        published_event_id,
        events!published_event_id (
          tickets_sold
        )
      `)
      .eq('status', 'approved');

    // Aggregate promoter data
    const promoterMap = new Map();
    drafts?.forEach(draft => {
      const promoterId = draft.promoter_id;
      if (!promoterMap.has(promoterId)) {
        promoterMap.set(promoterId, {
          promoter_id: promoterId,
          promoter_name: 'Loading...',
          total_events: 0,
          total_tickets_sold: 0,
          total_revenue: 0
        });
      }
      const promoterData = promoterMap.get(promoterId);
      promoterData.total_events += 1;
      promoterData.total_tickets_sold += draft.events?.tickets_sold || 0;
    });

    const promoterPerformance = Array.from(promoterMap.values());

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

### **Update Dashboard Page**

**File:** `/app/admin/page.tsx`

Replace the bar chart section with the new tables:

```typescript
import { VenuePerformanceTable } from '@/components/admin/VenuePerformanceTable';
import { PromoterPerformanceTable } from '@/components/admin/PromoterPerformanceTable';

// In the component:
const [venuePerformance, setVenuePerformance] = useState([]);
const [promoterPerformance, setPromoterPerformance] = useState([]);

// Fetch analytics data
useEffect(() => {
  async function fetchAnalytics() {
    const res = await fetch('/api/v1/admin/analytics');
    const data = await res.json();
    if (data.success) {
      setVenuePerformance(data.data.venuePerformance);
      setPromoterPerformance(data.data.promoterPerformance);
    }
  }
  fetchAnalytics();
}, []);

// In the JSX, replace charts with:
<VenuePerformanceTable data={venuePerformance} />
<PromoterPerformanceTable data={promoterPerformance} />
```

---

## ✅ Success Criteria

Tables complete when:
- [ ] Both tables display with real data
- [ ] Sorting works on all columns
- [ ] Search filters results correctly
- [ ] Pagination works (10 per page)
- [ ] Ranks auto-update based on sort
- [ ] Top 3 show medal badges
- [ ] Empty states display properly
- [ ] Mobile responsive
- [ ] Auto-refreshes with dashboard

---

## 🎯 Value Delivered

**Before:** Decorative bar charts  
**After:** Actionable intelligence

**Admins can now:**
- Identify top-performing venues
- Reward high-performing promoters
- Make data-driven partnership decisions
- Track platform growth metrics
- Export data for reporting (future)

---

**Time Estimate:** 4-6 hours
**Priority:** High - Better decision-making tools
**Impact:** Professional admin analytics
