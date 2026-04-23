'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { EventDraftCard, type EventDraft } from '@/components/promoter/EventDraftCard';

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
        <div className="flex items-center justify-center py-24">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Page Error</h1>
            <p className="text-[#7DD8E8] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              type="button"
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

function EventsContent() {
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'pending_review' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function fetchDrafts() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/promoter/events/draft');

      if (res.ok) {
        const data = await res.json();

        const validDrafts = (data.data || []).filter((draft: any) => {
          try {
            if (draft.ticket_prices) {
              if (Object.keys(draft.ticket_prices).length > 50) return false;
              if (JSON.stringify(draft.ticket_prices).length > 10000) return false;
            }
            if (draft.flyer_image_url?.startsWith('data:')) draft.flyer_image_url = null;
            if (draft.description && draft.description.length > 10000) {
              draft.description = draft.description.substring(0, 10000);
            }
            if (draft.tier_discounts && JSON.stringify(draft.tier_discounts).length > 1000) {
              draft.tier_discounts = null;
            }
            return true;
          } catch {
            return false;
          }
        });

        setDrafts(validDrafts);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }

  const refreshDrafts = async (deletedId?: string) => {
    if (deletedId) {
      setDrafts(prev => prev.filter(d => d.id !== deletedId));
    }
    try {
      const res = await fetch('/api/v1/promoter/events/draft');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to refresh events:', error);
    }
  };

  const filteredDrafts = activeTab === 'all'
    ? drafts
    : drafts.filter(d => d.status === activeTab);

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
          <p className="text-[#7DD8E8]">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-header font-bold text-white">My Events</h1>
          <p className="text-[#7DD8E8] mt-1">Manage your event listings and submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/promoter/events/create?mode=ai"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#7DD8E8]/15 text-[#7DD8E8] border border-[#7DD8E8]/30 font-semibold rounded-xl hover:bg-[#7DD8E8]/25 transition-colors"
          >
            <span>✨</span> AI Builder
          </Link>
          <Link
            href="/promoter/events/create"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
          >
            <span>+</span> Create Event
          </Link>
        </div>
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
            type="button"
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
            {activeTab === 'all' ? '🎫' : activeTab === 'draft' ? '✏️' : activeTab === 'pending_review' ? '⏳' : activeTab === 'approved' ? '✅' : '❌'}
          </span>
          <h3 className="text-lg font-semibold text-white mb-2">
            {activeTab === 'all' ? 'No events yet' : `No ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()} events`}
          </h3>
          <p className="text-[#7DD8E8] mb-6">
            {activeTab === 'all'
              ? 'Create your first event to get started!'
              : 'Events will appear here when their status changes.'}
          </p>
          {activeTab === 'all' && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/promoter/events/create?mode=ai"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#7DD8E8]/15 text-[#7DD8E8] border border-[#7DD8E8]/30 font-semibold rounded-xl hover:bg-[#7DD8E8]/25 transition-colors"
              >
                <span>✨</span> AI Builder
              </Link>
              <Link
                href="/promoter/events/create"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
              >
                <span>+</span> Create Event
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function PromoterEventsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <EventsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
