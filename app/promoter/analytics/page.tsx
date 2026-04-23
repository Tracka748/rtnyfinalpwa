'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  revenueByEvent: { eventId: string; eventName: string; revenue: number; ticketsSold: number }[];
  recentOrders: { id: string; eventName: string; total_amount: number; created_at: string }[];
  monthlySales: { month: string; revenue: number; tickets: number }[];
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-white/5 rounded-lg animate-pulse ${className ?? ''}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="flex items-end gap-2 h-40">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="flex-1" style={{ height: `${30 + i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
      <span className="text-5xl mb-4 block">📈</span>
      <h2 className="text-xl font-semibold text-white mb-2">No analytics yet</h2>
      <p className="text-[#7DD8E8] mb-6 max-w-sm mx-auto">
        Analytics appear once you have an approved event. Create your first event to get started.
      </p>
      <Link
        href="/promoter/events/create"
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
      >
        <span>+</span> Create Event
      </Link>
    </div>
  );
}

export default function PromoterAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/promoter/analytics')
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load analytics');
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-header font-bold text-white">Analytics</h1>
        <p className="text-[#7DD8E8] mt-1">Revenue, ticket sales, and performance insights</p>
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && data && data.totalEvents === 0 && <EmptyState />}

      {!loading && !error && data && data.totalEvents > 0 && (
        <>
          {/* ── STAT CARDS ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-xs font-medium text-[#7DD8E8] uppercase tracking-wider mb-2">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-[#59FFA0]">{fmt(data.totalRevenue)}</p>
              <p className="text-xs text-[#7DD8E8]/60 mt-1">from completed orders</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-xs font-medium text-[#7DD8E8] uppercase tracking-wider mb-2">
                Tickets Sold
              </p>
              <p className="text-3xl font-bold text-[#1AC8ED]">
                {data.totalTicketsSold.toLocaleString()}
              </p>
              <p className="text-xs text-[#7DD8E8]/60 mt-1">across all events</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-xs font-medium text-[#7DD8E8] uppercase tracking-wider mb-2">
                Live Events
              </p>
              <p className="text-3xl font-bold text-white">{data.totalEvents}</p>
              <p className="text-xs text-[#7DD8E8]/60 mt-1">approved events</p>
            </div>
          </div>

          {/* ── CHARTS ROW ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Event — horizontal bars */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Revenue by Event
              </h2>
              {data.revenueByEvent.length === 0 ? (
                <p className="text-sm text-[#7DD8E8]/60 py-6 text-center">No revenue data yet</p>
              ) : (() => {
                const maxRev = Math.max(...data.revenueByEvent.map(e => e.revenue), 1);
                return (
                  <div className="space-y-3">
                    {data.revenueByEvent
                      .slice()
                      .sort((a, b) => b.revenue - a.revenue)
                      .map(event => {
                        const pct = Math.max(4, (event.revenue / maxRev) * 100);
                        return (
                          <div key={event.eventId}>
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="text-xs text-white truncate max-w-[55%]">
                                {event.eventName}
                              </span>
                              <span className="text-xs text-[#7DD8E8] shrink-0">
                                {fmt(event.revenue)} · {event.ticketsSold} tkts
                              </span>
                            </div>
                            <div className="h-5 bg-white/5 rounded-md overflow-hidden">
                              <div
                                className="h-full bg-[#59FFA0]/70 rounded-md transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>

            {/* Monthly Sales — vertical bars */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Monthly Sales
              </h2>
              {(() => {
                const maxRev = Math.max(...data.monthlySales.map(m => m.revenue), 1);
                const hasAny = data.monthlySales.some(m => m.revenue > 0);
                return (
                  <>
                    <div className="flex items-end gap-2 h-40">
                      {data.monthlySales.map(month => {
                        const heightPct = hasAny
                          ? Math.max(4, (month.revenue / maxRev) * 100)
                          : 4;
                        return (
                          <div
                            key={month.month}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-[10px] text-[#7DD8E8]/70 leading-none">
                              {month.revenue > 0 ? fmt(month.revenue).replace('$', '') : ''}
                            </span>
                            <div className="w-full bg-white/5 rounded-t-md overflow-hidden flex items-end" style={{ height: '100%' }}>
                              <div
                                className="w-full bg-[#1AC8ED]/70 rounded-t-md transition-all duration-500"
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {data.monthlySales.map(month => (
                        <div key={month.month} className="flex-1 text-center">
                          <span className="text-[10px] text-[#7DD8E8]/60">{month.month}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── RECENT ORDERS TABLE ───────────────────────────────────────── */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Recent Orders
              </h2>
            </div>

            {data.recentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#7DD8E8]/60">
                No orders yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-5 py-3 text-left text-xs font-medium text-[#7DD8E8]/70 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-[#7DD8E8]/70 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-[#7DD8E8]/70 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3 text-white truncate max-w-[200px]">
                          {order.eventName}
                        </td>
                        <td className="px-5 py-3 text-right text-[#59FFA0] font-medium">
                          {fmt(order.total_amount)}
                        </td>
                        <td className="px-5 py-3 text-right text-[#7DD8E8]/70">
                          {fmtDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
