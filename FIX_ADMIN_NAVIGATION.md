# Fix: Admin Navigation Links & Missing Data

## 🚨 Current Issues

1. **Application Review page shows no data** - Likely empty table or query issue
2. **Other admin links don't work** - Pages probably don't exist yet
3. **Can't approve/reject** - No functionality built

---

## 🔍 Step 1: Diagnose Application Review Page

### Check if the page exists:

**Expected file:** `/app/admin/promoter-applications/page.tsx`

**If it exists, check:**
1. Is the API call correct?
2. Is the data query working?
3. Are there actual applications in the database?

### Debug Queries:

**Check if applications exist in database:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM promoter_applications;
```

**If table is empty:** You need to test the promoter application flow first!

---

## 🛠️ Step 2: Create Missing Admin Pages

### Pages that should exist based on sidebar:

1. ✅ `/app/admin/page.tsx` - Dashboard (EXISTS)
2. ❓ `/app/admin/events/page.tsx` - Events list
3. ❓ `/app/admin/promoter-applications/page.tsx` - Applications
4. ❓ `/app/admin/event-drafts/page.tsx` - Drafts review
5. ❓ `/app/admin/orders/page.tsx` - Orders list
6. ❓ `/app/admin/settings/page.tsx` - Settings

---

## 🎯 Priority Order: Build These Pages

### **PRIORITY 1: Promoter Applications Review** (2 hours)

**File:** `/app/admin/promoter-applications/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface PromoterApplication {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  social_media: string;
  promoter_type: string;
  toolkit_features: string[];
  expected_volume: string;
  event_description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function PromoterApplicationsPage() {
  const [applications, setApplications] = useState<PromoterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  async function fetchApplications() {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/admin/promoter-applications?status=${filter}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      console.log('Applications data:', data);
      
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('Approve this promoter application?')) return;

    try {
      const response = await fetch(`/api/v1/admin/promoter-applications/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to approve application');
      }

      alert('Application approved!');
      fetchApplications();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch(`/api/v1/admin/promoter-applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject application');
      }

      alert('Application rejected.');
      fetchApplications();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#59FFA0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <button
          onClick={fetchApplications}
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-header font-bold text-white mb-2">
          Promoter Applications
        </h1>
        <p className="text-gray-400">
          Review and approve promoter signup requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 text-lg mb-2">No applications found</p>
          <p className="text-sm text-gray-500">
            {filter === 'pending' 
              ? 'No pending applications to review'
              : `No ${filter} applications`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-header font-bold text-white">
                      {app.business_name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      app.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : app.status === 'approved'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="text-white ml-2">{app.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="text-white ml-2">{app.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="text-white ml-2">{app.promoter_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Volume:</span>
                      <span className="text-white ml-2">{app.expected_volume}</span>
                    </div>
                  </div>

                  {app.toolkit_features?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Requested Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {app.toolkit_features.map((feature, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-[#007BFF]/20 text-[#007BFF] rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {app.event_description && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Description:</p>
                      <p className="text-sm text-gray-300 italic">
                        "{app.event_description}"
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Applied: {new Date(app.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Actions */}
                {app.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**API Route:** `/app/api/v1/admin/promoter-applications/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('promoter_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} applications`);

    return NextResponse.json({
      success: true,
      data: data || [],
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

**Approve Endpoint:** `/app/api/v1/admin/promoter-applications/[id]/approve/route.ts`

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
    const { id } = params;

    // Update application status
    const { error } = await supabase
      .from('promoter_applications')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // TODO: Send approval email to promoter
    // TODO: Create promoter account/role

    return NextResponse.json({
      success: true,
      message: 'Application approved'
    });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    );
  }
}
```

**Reject Endpoint:** `/app/api/v1/admin/promoter-applications/[id]/reject/route.ts`

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
    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    // Update application status
    const { error } = await supabase
      .from('promoter_applications')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // TODO: Send rejection email with reason

    return NextResponse.json({
      success: true,
      message: 'Application rejected'
    });
  } catch (error) {
    console.error('Reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Steps

1. **Test if applications exist:**
   - Navigate to `/promoter/apply`
   - Fill out form and submit
   - Check Supabase table

2. **Test admin review:**
   - Go to `/admin/promoter-applications`
   - Should see the application
   - Click Approve/Reject
   - Verify status changes

3. **Test filters:**
   - Click "All", "Pending", "Approved", "Rejected"
   - Verify correct applications show

---

## ✅ Success Criteria

Admin workflow complete when:
- [ ] Applications page shows pending applications
- [ ] Approve button changes status to "approved"
- [ ] Reject button changes status to "rejected"  
- [ ] Filters work (All, Pending, Approved, Rejected)
- [ ] Empty state shows when no applications
- [ ] Error handling works

---

**After this works, we'll build Event Drafts review page next!**
