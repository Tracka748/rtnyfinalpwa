'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SalesChart } from '@/components/admin/SalesChart';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { RevenueVsTicketsChart } from '@/components/admin/RevenueVsTicketsChart';
import { TopEventsChart } from '@/components/admin/TopEventsChart';
import { ExportButton } from '@/components/admin/ExportButton';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';

interface DashboardStats {
  activeEvents: number;
  totalTicketsSold: number;
  ticketsSoldToday: number;
  revenue30Days: number;
  pendingApplications: number;
  pendingDrafts: number;
}

interface TopEvent {
  name: string;
  tickets_sold: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  async function fetchDashboardData(silent = false) {
    try {
      if (!silent) setLoading(true);

      const response = await fetch('/api/v1/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setSalesTrend(data.data.salesTrend || []);
        setRecentActivity(data.data.recentActivity || []);
        setTopEvents(data.data.topEvents || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      if (!silent) setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Failed to load dashboard: {error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const exportData = recentActivity.map(item => ({
    event: item.events?.name || 'Unknown',
    customer: item.users?.email || 'Guest',
    amount: item.total_amount,
    status: item.status,
    date: new Date(item.created_at).toLocaleDateString(),
  }));

  const revenueVsTicketsData = salesTrend.map(d => ({
    date: d.date,
    revenue: d.revenue,
    tickets: d.count,
  }));

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Refresh controls — hidden on mobile (top bar handles branding) */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-header font-bold text-white mb-1">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-400">Real-time insights into platform performance</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Updated {lastUpdated.toLocaleTimeString()}</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              autoRefresh
                ? 'bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30'
                : 'bg-white/5 text-gray-400 border border-white/10'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="px-3 py-2 bg-[#007BFF]/20 text-[#007BFF] border border-[#007BFF]/30 rounded-lg text-xs font-medium hover:bg-[#007BFF]/30 transition-colors disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Mobile: mini refresh bar */}
      <div className="flex md:hidden items-center justify-between">
        <span className="text-xs text-gray-500">
          Updated {lastUpdated.toLocaleTimeString()}
        </span>
        <button
          onClick={() => fetchDashboardData()}
          disabled={loading}
          className="px-3 py-1.5 bg-[#007BFF]/20 text-[#007BFF] border border-[#007BFF]/30 rounded-lg text-xs font-medium hover:bg-[#007BFF]/30 transition-colors disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Pending Items Alert */}
      {((stats?.pendingApplications || 0) > 0 || (stats?.pendingDrafts || 0) > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-header font-bold text-yellow-400 mb-3">
            ⚠️ Pending Reviews
          </h3>
          <div className="flex gap-6">
            {(stats?.pendingApplications || 0) > 0 && (
              <div>
                <p className="text-xl md:text-2xl font-bold text-yellow-300">
                  {stats?.pendingApplications}
                </p>
                <p className="text-xs md:text-sm text-gray-400">Promoter Applications</p>
                <a
                  href="/admin/promoter-applications"
                  className="text-xs md:text-sm text-yellow-400 hover:text-yellow-300 underline mt-1 inline-block"
                >
                  Review Now →
                </a>
              </div>
            )}
            {(stats?.pendingDrafts || 0) > 0 && (
              <div>
                <p className="text-xl md:text-2xl font-bold text-yellow-300">
                  {stats?.pendingDrafts}
                </p>
                <p className="text-xs md:text-sm text-gray-400">Event Drafts</p>
                <a
                  href="/admin/event-drafts"
                  className="text-xs md:text-sm text-yellow-400 hover:text-yellow-300 underline mt-1 inline-block"
                >
                  Review Now →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Metrics */}
      <section className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-xl font-header font-bold text-white">
          📈 Metrics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <StatsCard
            title="Active Events"
            value={stats?.activeEvents || 0}
            icon="🎫"
            color="green"
            subtitle="Live now"
          />
          <StatsCard
            title="Today's Sales"
            value={stats?.ticketsSoldToday || 0}
            icon="🔥"
            color="blue"
            subtitle="Tickets"
          />
          <StatsCard
            title="Revenue"
            value={`$${(stats?.revenue30Days || 0).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`}
            icon="💰"
            color="green"
            subtitle="30 days"
          />
          <StatsCard
            title="Total"
            value={stats?.totalTicketsSold || 0}
            icon="🎟️"
            color="white"
            subtitle="All-time"
          />
        </div>
      </section>

      {/* Section: Analytics */}
      <section className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-xl font-header font-bold text-white">
          📊 Analytics
        </h2>

        {/* Row 1: Sales trend + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <SalesChart data={salesTrend} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-header font-bold text-white mb-3 md:mb-4">
              ⚡ Quick Actions
            </h3>
            {/* Horizontal scroll on mobile, vertical on desktop */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex md:flex-col gap-3 min-w-max md:min-w-0">
                <a
                  href="/admin/event-drafts"
                  className="shrink-0 md:shrink p-3 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg hover:bg-[#59FFA0]/20 transition-colors min-w-[180px] md:min-w-0"
                >
                  <div className="font-medium text-[#59FFA0] text-sm">Review Drafts</div>
                  <div className="text-xs text-gray-400 mt-0.5">Approve pending events</div>
                </a>
                <a
                  href="/admin/promoter-applications"
                  className="shrink-0 md:shrink p-3 bg-[#007BFF]/10 border border-[#007BFF]/30 rounded-lg hover:bg-[#007BFF]/20 transition-colors min-w-[180px] md:min-w-0"
                >
                  <div className="font-medium text-[#007BFF] text-sm">Applications</div>
                  <div className="text-xs text-gray-400 mt-0.5">Review promoter requests</div>
                </a>
                <a
                  href="/admin/events"
                  className="shrink-0 md:shrink p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors min-w-[180px] md:min-w-0"
                >
                  <div className="font-medium text-white text-sm">Manage Events</div>
                  <div className="text-xs text-gray-400 mt-0.5">View all live events</div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Revenue vs Tickets + Top Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <RevenueVsTicketsChart data={revenueVsTicketsData} />
          <TopEventsChart events={topEvents} />
        </div>
      </section>

      {/* Section: Recent Activity */}
      <section className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-xl font-header font-bold text-white">
          🕐 Recent Activity
        </h2>
        <RecentActivity
          items={recentActivity}
          exportButton={
            <ExportButton
              data={exportData}
              filename="rtny_recent_orders"
            />
          }
        />
      </section>
    </div>
  );
}
