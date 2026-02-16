// app/promoter/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

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
            <p className="text-gray-400 mb-4">
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

// Types
interface EventDraft {
  id: string;
  name: string;
  description: string | null;
  category: string;
  event_date: string;
  venue_id?: string;
  venue_name: string | null;
  total_tickets: number;
  ticket_prices: Record<string, number>;
  flyer_image_url: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  published_event_id?: string;
}

interface PromoterApplication {
  id: string;
  business_name: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  rejection_reason: string | null;
}

// Category config matching your event cards
const categoryConfig: Record<string, { icon: string; label: string }> = {
  nightlife: { icon: '🎉', label: 'Nightlife' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
  movies: { icon: '🎬', label: 'Movies' },
  dining: { icon: '🍽️', label: 'Dining' },
  arts: { icon: '🎨', label: 'Arts' },
  sports: { icon: '⚽', label: 'Sports' },
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    pending_review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

// Event draft card component
function EventDraftCard({ draft, onDraftUpdate }: { draft: EventDraft; onDraftUpdate?: (deletedId?: string) => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cat = categoryConfig[draft.category] || { icon: '📅', label: draft.category };
  const eventDate = new Date(draft.event_date);
  const ticketTypeCount = Object.keys(draft.ticket_prices || {}).length;
  const minPrice = Math.min(...Object.values(draft.ticket_prices || { '': 0 }));

  const handleEdit = () => {
    router.push(`/promoter/events/create?draft=${draft.id}`);
  };

  const handleSubmit = async () => {
    // Debug: log what fields the draft actually has
    console.log('Submit validation check:', {
      name: draft.name,
      category: draft.category,
      event_date: draft.event_date,
      venue_id: draft.venue_id,
      venue_name: draft.venue_name,
      ticket_prices: draft.ticket_prices,
      ticket_prices_keys: draft.ticket_prices ? Object.keys(draft.ticket_prices) : [],
    });

    const missingFields: string[] = [];
    if (!draft.name) missingFields.push('name');
    if (!draft.category) missingFields.push('category');
    if (!draft.event_date) missingFields.push('event date');
    if (!draft.venue_name && !draft.venue_id) missingFields.push('venue');
    if (!draft.ticket_prices || Object.keys(draft.ticket_prices).length === 0) missingFields.push('ticket prices');

    if (missingFields.length > 0) {
      alert(`Cannot submit: Missing ${missingFields.join(', ')}. Please edit the draft first.`);
      return;
    }

    if (!confirm('Submit this event for review? You won\'t be able to delete it after submission.')) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/v1/promoter/events/draft/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submit_for_review: true,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit');
      }

      alert('Draft submitted for review! You\'ll be notified when it\'s approved.');
      if (onDraftUpdate) onDraftUpdate();
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log('Deleting draft:', draft.id, draft.name, 'status:', draft.status);

      const response = await fetch(`/api/v1/promoter/events/draft/${draft.id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      const responseText = await response.text();
      console.log('Delete response body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Delete failed (${response.status})`);
      }

      console.log('Delete successful, refreshing drafts...');
      if (onDraftUpdate) onDraftUpdate(draft.id);
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete draft');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.icon}</span>
          <span className="text-xs font-label text-[#59FFA0] uppercase tracking-wider">
            {cat.label}
          </span>
        </div>
        <StatusBadge status={draft.status} />
      </div>

      <h3 className="font-slab-serif text-lg font-bold text-white mb-2 line-clamp-1">
        {draft.name}
      </h3>

      <div className="space-y-1.5 text-sm text-gray-400 mb-3">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="text-gray-600">•</span>
          <span>{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
        {draft.venue_name && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="line-clamp-1">{draft.venue_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span>🎫</span>
          <span>{draft.total_tickets} tickets • {ticketTypeCount} type{ticketTypeCount !== 1 ? 's' : ''} • from ${minPrice.toFixed(2)}</span>
        </div>
      </div>

      {draft.status === 'draft' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={isSubmitting || isDeleting}
              className="flex-1 px-3 py-2 bg-[#59FFA0]/10 text-[#59FFA0] rounded-lg text-sm font-medium hover:bg-[#59FFA0]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isDeleting}
              className="px-3 py-2 bg-white/5 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Submitting...</span>
                </>
              ) : (
                'Submit for Review'
              )}
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="w-full px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-500/20"
          >
            {isDeleting ? (
              <>
                <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Deleting...</span>
              </>
            ) : (
              'Delete Draft'
            )}
          </button>
        </div>
      )}

      {draft.status === 'rejected' && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-300">Contact support for details about rejection.</p>
        </div>
      )}
    </div>
  );
}

// Main dashboard content (wrapped in Suspense for useSearchParams)
function DashboardContent() {
  const router = useRouter();
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
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121113] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Success Banner */}
        {showCreatedBanner && (
          <div className="mb-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold text-[#59FFA0]">Event submitted successfully!</p>
                <p className="text-sm text-gray-400">Your event has been saved and will be reviewed by our team.</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreatedBanner(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-header font-bold">Promoter Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your events and track performance</p>
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
            <p className="text-xs text-gray-400 mt-1">Total Events</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-gray-400 mt-1">Pending Review</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#59FFA0]">{stats.approved}</p>
            <p className="text-xs text-gray-400 mt-1">Approved</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.drafts}</p>
            <p className="text-xs text-gray-400 mt-1">Drafts</p>
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
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
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
            <p className="text-gray-400 mb-4">
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
              <p className="text-xs text-gray-400">Add a new event listing</p>
            </div>
          </Link>
          <Link
            href="/events"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-medium text-white">Browse Events</p>
              <p className="text-xs text-gray-400">See all live events</p>
            </div>
          </Link>
          <Link
            href="/promoter/apply"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium text-white">Application Status</p>
              <p className="text-xs text-gray-400">Check your promoter application</p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function PromoterDashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-[#121113] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}