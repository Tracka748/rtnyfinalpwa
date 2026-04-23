// app/promoter/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { EventDraftCard, StatusBadge, type EventDraft } from '@/components/promoter/EventDraftCard';

// Error boundary to catch rendering crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121113] text-white flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Dashboard Error</h1>
            <p className="text-[#7DD8E8] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#59FFA0] text-black rounded-lg hover:bg-[#59FFA0]/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PromoterApplication {
  id: string;
  business_name: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  rejection_reason: string | null;
}

// Main dashboard content (wrapped in Suspense for useSearchParams)
function DashboardContent() {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === 'true';

  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [application, setApplication] = useState<PromoterApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch drafts
      const draftsRes = await fetch('/api/v1/promoter/events/draft');

      console.log('Drafts API response status:', draftsRes.status);

      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();

        console.log('Drafts data received:', {
          success: draftsData.success,
          dataLength: draftsData.data?.length,
        });

        // VALIDATE AND SANITIZE DATA
        const validDrafts = (draftsData.data || []).filter((draft: any) => {
          try {
            // Safety check 1: ticket_prices must be reasonable size
            if (draft.ticket_prices) {
              const ticketKeys = Object.keys(draft.ticket_prices);
              if (ticketKeys.length > 50) {
                console.error('Draft has corrupt ticket_prices (too many keys):', draft.id, draft.name);
                return false;
              }

              const priceJsonSize = JSON.stringify(draft.ticket_prices).length;
              if (priceJsonSize > 10000) {
                console.error('Draft has oversized ticket_prices JSON:', draft.id, draft.name, priceJsonSize);
                return false;
              }
            }

            // Safety check 2: flyer_image_url should be URL, not base64
            if (draft.flyer_image_url?.startsWith('data:')) {
              console.warn('Draft has base64 image (clearing it):', draft.id, draft.name);
              draft.flyer_image_url = null;
            }

            // Safety check 3: description should be reasonable length
            if (draft.description && draft.description.length > 10000) {
              console.warn('Draft has huge description (truncating):', draft.id, draft.name, draft.description.length);
              draft.description = draft.description.substring(0, 10000);
            }

            // Safety check 4: tier_discounts must be reasonable
            if (draft.tier_discounts) {
              const tierJsonSize = JSON.stringify(draft.tier_discounts).length;
              if (tierJsonSize > 1000) {
                console.error('Draft has oversized tier_discounts:', draft.id, draft.name);
                draft.tier_discounts = null;
              }
            }

            return true;
          } catch (error) {
            console.error('Error validating draft:', draft.id, error);
            return false;
          }
        });

        console.log('Valid drafts after filtering:', validDrafts.length, 'out of', draftsData.data?.length || 0);

        setDrafts(validDrafts);
      }

      // Fetch application status (optional)
      try {
        const appRes = await fetch('/api/v1/promoter/application/status');
        if (appRes.ok) {
          const appData = await appRes.json();
          setApplication(appData.data || null);
        }
      } catch {
        // Endpoint may not exist yet - that's fine
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }

  const refreshDrafts = async (deletedId?: string) => {
    // Optimistic removal: immediately remove the deleted draft from UI
    if (deletedId) {
      setDrafts(prev => prev.filter(d => d.id !== deletedId));
    }
    try {
      const draftsRes = await fetch('/api/v1/promoter/events/draft');
      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setDrafts(draftsData.data || []);
      }
    } catch (error) {
      console.error('Failed to refresh drafts:', error);
    }
  };

  // Filter drafts by tab
  const filteredDrafts = activeTab === 'all'
    ? drafts
    : drafts.filter(d => d.status === activeTab);

  // Quick stats
  const stats = {
    total: drafts.length,
    drafts: drafts.filter(d => d.status === 'draft').length,
    pending: drafts.filter(d => d.status === 'pending_review').length,
    approved: drafts.filter(d => d.status === 'approved').length,
    rejected: drafts.filter(d => d.status === 'rejected').length,
  };

  const tabs = [
    { key: 'all' as const, label: 'All Events', count: stats.total },
    { key: 'draft' as const, label: 'Drafts', count: stats.drafts },
    { key: 'pending_review' as const, label: 'Pending', count: stats.pending },
    { key: 'approved' as const, label: 'Approved', count: stats.approved },
    { key: 'rejected' as const, label: 'Rejected', count: stats.rejected },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7DD8E8]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Banner */}
      {showCreatedBanner && (
        <div className="mb-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-[#59FFA0]">Event submitted successfully!</p>
              <p className="text-sm text-[#7DD8E8]">Your event has been saved and will be reviewed by our team.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatedBanner(false)}
            className="text-[#7DD8E8] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-header font-bold">Promoter Dashboard</h1>
          <p className="text-[#7DD8E8] mt-1">Manage your events and track performance</p>
        </div>
        <Link
          href="/promoter/events/create"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
        >
          <span className="text-lg">+</span>
          Create Event
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-[#7DD8E8] mt-1">Total Events</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-[#7DD8E8] mt-1">Pending Review</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#59FFA0]">{stats.approved}</p>
          <p className="text-xs text-[#7DD8E8] mt-1">Approved</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#7DD8E8]">{stats.drafts}</p>
          <p className="text-xs text-[#7DD8E8] mt-1">Drafts</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30'
                : 'bg-white/5 text-[#7DD8E8] border border-white/10 hover:bg-white/10'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-[#59FFA0]/30' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {filteredDrafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrafts.map(draft => (
            <EventDraftCard key={draft.id} draft={draft} onDraftUpdate={refreshDrafts} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-4xl mb-4 block">
            {activeTab === 'all' ? '📝' : activeTab === 'draft' ? '✏️' : activeTab === 'pending_review' ? '⏳' : activeTab === 'approved' ? '✅' : '❌'}
          </span>
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === 'all' ? 'No events yet' : `No ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()} events`}
          </h3>
          <p className="text-[#7DD8E8] mb-4">
            {activeTab === 'all'
              ? 'Create your first event to get started!'
              : 'Events will appear here when their status changes.'}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/promoter/events/create"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
            >
              <span>+</span> Create Your First Event
            </Link>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/promoter/events/create"
          className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
        >
          <span className="text-2xl">🎪</span>
          <div>
            <p className="font-medium text-white">Create Event</p>
            <p className="text-xs text-[#7DD8E8]">Add a new event listing</p>
          </div>
        </Link>
        <Link
          href="/events"
          className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="font-medium text-white">Browse Events</p>
            <p className="text-xs text-[#7DD8E8]">See all live events</p>
          </div>
        </Link>
        <Link
          href="/promoter/apply"
          className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-medium text-white">Application Status</p>
            <p className="text-xs text-[#7DD8E8]">Check your promoter application</p>
          </div>
        </Link>
      </div>
    </>
  );
}

// Wrap in Suspense for useSearchParams
export default function PromoterDashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
