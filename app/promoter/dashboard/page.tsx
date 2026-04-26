// app/promoter/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { StatusBadge, type EventDraft } from '@/components/promoter/EventDraftCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolkitFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  price_one_time: number | null;
  price_monthly: number | null;
  sort_order: number;
  is_unlocked: boolean;
  unlock_info: {
    unlock_type: string;
    unlocked_at: string;
    expires_at: string | null;
  } | null;
}

const FEATURE_ROUTES: Record<string, string> = {
  analytics: '/promoter/analytics',
  qr_tickets: '/admin/scan',
  promo_codes: '/promoter/promo-codes',
  ai_flyer: '/promoter/events/create?mode=ai',
};

// ─── Error boundary ───────────────────────────────────────────────────────────

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

// ─── Unlock modal ─────────────────────────────────────────────────────────────

function UnlockModal({
  feature,
  onClose,
}: {
  feature: ToolkitFeature;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock(unlock_type: 'purchased' | 'subscription') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/promoter/toolkit/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: feature.id, unlock_type }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to create checkout session');
        return;
      }
      window.location.href = json.data.checkout_url;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#1a1a1d] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-5xl mb-4 text-center">{feature.icon}</div>
        <h2 className="text-2xl font-header font-bold text-white text-center mb-2">
          Unlock <span className="text-[#59FFA0]">{feature.name}</span>
        </h2>
        <p className="text-[#7DD8E8] text-sm text-center mb-8 leading-relaxed">
          {feature.description}
        </p>

        <div className="flex gap-3 mb-4">
          {feature.price_one_time != null && (
            <button
              disabled={loading}
              onClick={() => handleUnlock('purchased')}
              className="flex-1 px-4 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <>Buy Once — ${feature.price_one_time}</>
              )}
            </button>
          )}
          {feature.price_monthly != null && (
            <button
              disabled={loading}
              onClick={() => handleUnlock('subscription')}
              className="flex-1 px-4 py-3 bg-transparent border border-[#1AC8ED] text-[#1AC8ED] font-semibold rounded-xl hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#1AC8ED] border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <>Subscribe — ${feature.price_monthly}/mo</>
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-4">{error}</p>
        )}

        <button
          onClick={onClose}
          className="w-full text-sm text-[#7DD8E8]/60 hover:text-[#7DD8E8] transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Toolkit skeleton ─────────────────────────────────────────────────────────

function ToolkitSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse space-y-3">
          <div className="h-10 w-10 bg-white/10 rounded-lg" />
          <div className="h-5 w-3/4 bg-white/10 rounded" />
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-2/3 bg-white/5 rounded" />
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-20 bg-white/10 rounded-full" />
            <div className="h-6 w-20 bg-white/10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justCreated = searchParams.get('created') === 'true';
  const unlockedFeatureId = searchParams.get('unlocked') ?? '';

  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [toolkit, setToolkit] = useState<ToolkitFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolkitLoading, setToolkitLoading] = useState(true);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);
  const [selectedFeature, setSelectedFeature] = useState<ToolkitFeature | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/promoter/events/draft');
      if (!res.ok) return;
      const data = await res.json();
      const valid = (data.data || []).filter((draft: any) => {
        try {
          if (draft.ticket_prices && Object.keys(draft.ticket_prices).length > 50) return false;
          if (draft.ticket_prices && JSON.stringify(draft.ticket_prices).length > 10000) return false;
          if (draft.flyer_image_url?.startsWith('data:')) draft.flyer_image_url = null;
          if (draft.description?.length > 10000) draft.description = draft.description.substring(0, 10000);
          if (draft.tier_discounts && JSON.stringify(draft.tier_discounts).length > 1000) draft.tier_discounts = null;
          return true;
        } catch { return false; }
      });
      setDrafts(valid);
    } catch { /* silent */ }
  }, []);

  const fetchToolkit = useCallback(async () => {
    setToolkitLoading(true);
    try {
      const res = await fetch('/api/v1/promoter/toolkit');
      const json = await res.json();
      if (json.success) setToolkit(json.data.features);
    } catch { /* silent */ } finally {
      setToolkitLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDrafts(), fetchToolkit()]).finally(() => setLoading(false));
  }, [fetchDrafts, fetchToolkit]);

  function handleCardClick(feature: ToolkitFeature) {
    if (feature.is_unlocked) {
      const route = FEATURE_ROUTES[feature.id] ?? `/promoter/coming-soon?feature=${feature.id}`;
      router.push(route);
    } else {
      setSelectedFeature(feature);
    }
  }

  const stats = {
    total: drafts.length,
    approved: drafts.filter(d => d.status === 'approved').length,
    pending: drafts.filter(d => d.status === 'pending_review').length,
    unlocked: toolkit.filter(f => f.is_unlocked).length,
  };

  const recentDrafts = drafts
    .filter(d => d.status === 'approved' || d.status === 'pending_review')
    .slice(0, 3);

  const unlockedFeature = unlockedFeatureId
    ? toolkit.find(f => f.id === unlockedFeatureId)
    : null;

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
      {/* Unlock success banner */}
      {unlockedFeatureId && (
        <div className="mb-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <p className="font-semibold text-[#59FFA0]">
              {unlockedFeature ? unlockedFeature.name : unlockedFeatureId} has been unlocked!{' '}
              <span className="font-normal text-[#7DD8E8]">Click the card to get started.</span>
            </p>
          </div>
          <Link
            href="/promoter/dashboard"
            replace
            className="text-[#7DD8E8] hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </Link>
        </div>
      )}

      {/* Event created banner */}
      {showCreatedBanner && (
        <div className="mb-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-[#59FFA0]">Event submitted successfully!</p>
              <p className="text-sm text-[#7DD8E8]">Your event has been saved and will be reviewed by our team.</p>
            </div>
          </div>
          <button onClick={() => setShowCreatedBanner(false)} className="text-[#7DD8E8] hover:text-white transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#59FFA0]/10 via-[#1AC8ED]/10 to-[#59FFA0]/10 border border-[#59FFA0]/20 p-8">
        <h1 className="text-4xl md:text-5xl font-header font-bold mb-2">
          Welcome to your <span className="text-[#59FFA0]">RTNY Hub</span>
        </h1>
        <p className="text-[#7DD8E8] text-lg">Manage events, unlock tools, and grow your audience</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/promoter/events/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors text-sm"
          >
            <span>+</span> Create Event
          </Link>
          <Link
            href="/promoter/events/create?mode=ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors text-sm"
          >
            🤖 AI Builder
          </Link>
        </div>
      </div>

      {/* ── STATS BANNER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Events', value: stats.total, color: 'text-white' },
          { label: 'Approved', value: stats.approved, color: 'text-[#59FFA0]' },
          { label: 'Pending Review', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Tools Unlocked', value: stats.unlocked, color: 'text-[#1AC8ED]' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#7DD8E8] mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TOOLKIT ── */}
      <div className="mb-10">
        <div className="mb-6">
          <h2 className="text-2xl font-header font-bold">
            🚀 Your <span className="text-[#1AC8ED]">RTNY</span> Toolkit
          </h2>
          <p className="text-[#7DD8E8] text-sm mt-1">
            Unlock powerful tools to grow your events
          </p>
        </div>

        {toolkitLoading ? (
          <ToolkitSkeleton />
        ) : toolkit.length === 0 ? null : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolkit.map(feature => (
              <div
                key={feature.id}
                onClick={() => handleCardClick(feature)}
                className={`relative bg-white/5 border rounded-xl p-6 transition-all cursor-pointer ${
                  feature.is_unlocked
                    ? 'border-[#59FFA0]/40 hover:border-[#59FFA0]/60 hover:bg-white/[0.07]'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <div className="absolute top-4 right-4">
                  {feature.is_unlocked
                    ? <span className="text-[#59FFA0] text-lg">✅</span>
                    : <span className="text-[#7DD8E8]/60 text-lg">🔒</span>
                  }
                </div>

                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-header font-bold text-white mb-2">{feature.name}</h3>
                <p className="text-[#7DD8E8] text-sm mb-4">{feature.description}</p>

                {feature.is_unlocked ? (
                  <div className="text-xs text-[#59FFA0] font-medium uppercase tracking-wider">
                    ✓ Unlocked — Click to open
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {feature.price_one_time != null && (
                      <span className="px-2 py-1 bg-[#59FFA0]/10 text-[#59FFA0] rounded-full">
                        ${feature.price_one_time} one-time
                      </span>
                    )}
                    {feature.price_monthly != null && (
                      <span className="px-2 py-1 bg-[#1AC8ED]/10 text-[#1AC8ED] rounded-full">
                        ${feature.price_monthly}/mo
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENT EVENTS ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-header font-bold">
            📋 Recent <span className="text-[#59FFA0]">Events</span>
          </h2>
          <Link href="/promoter/events" className="text-sm text-[#7DD8E8] hover:text-white transition-colors">
            See all events →
          </Link>
        </div>

        {recentDrafts.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <span className="text-3xl block mb-3">📝</span>
            <p className="text-[#7DD8E8] text-sm mb-4">No approved or pending events yet.</p>
            <Link
              href="/promoter/events/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors text-sm"
            >
              + Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {recentDrafts.map((draft, i) => (
              <div
                key={draft.id}
                className={`flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                  i < recentDrafts.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">🎪</span>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{draft.name}</p>
                    <p className="text-xs text-[#7DD8E8]/60 mt-0.5">
                      {new Date(draft.event_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <StatusBadge status={draft.status} />
                  <Link
                    href={`/promoter/events/${draft.id}`}
                    className="text-xs text-[#7DD8E8] hover:text-white transition-colors whitespace-nowrap"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div>
        <h2 className="text-xl font-header font-bold mb-4">
          ⚡ Quick <span className="text-[#59FFA0]">Actions</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🎪', label: 'Create Event', sub: 'Add a new event listing', href: '/promoter/events/create' },
            { icon: '🤖', label: 'AI Builder', sub: 'Generate an event with AI', href: '/promoter/events/create?mode=ai' },
            { icon: '📊', label: 'View Analytics', sub: 'Revenue and ticket insights', href: '/promoter/analytics' },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] hover:border-white/20 transition-all"
            >
              <span className="text-3xl">{action.icon}</span>
              <div>
                <p className="font-semibold text-white">{action.label}</p>
                <p className="text-xs text-[#7DD8E8] mt-0.5">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Unlock modal */}
      {selectedFeature && (
        <UnlockModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      )}
    </>
  );
}

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
