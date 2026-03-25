'use client';

import { useState } from 'react';

interface ChartData {
  date: string;
  revenue: number;
  tickets: number;
}

interface RevenueVsTicketsChartProps {
  data: ChartData[];
}

export function RevenueVsTicketsChart({ data }: RevenueVsTicketsChartProps) {
  // Collapsed by default on mobile (secondary chart)
  const [isExpanded, setIsExpanded] = useState(false);

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const maxTickets = Math.max(...data.map(d => d.tickets), 1);
  const chartHeight = 160;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-header font-bold text-white">
          Revenue vs Tickets (30 Days)
        </h3>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#59FFA0] rounded-sm" />
              <span className="text-xs text-[#7DD8E8]">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#007BFF] rounded-sm" />
              <span className="text-xs text-[#7DD8E8]">Tickets</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-1 text-[#7DD8E8] text-xs"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <div className={isExpanded ? 'block' : 'hidden md:block'}>
        {data.length === 0 ? (
          <div className="h-[160px] flex flex-col items-center justify-center text-center gap-2">
            <div className="text-3xl">📉</div>
            <p className="text-[#7DD8E8] text-sm font-medium">No data yet</p>
            <p className="text-xs text-[#7DD8E8]">Will populate with order history</p>
          </div>
        ) : (
          <div
            className="relative flex items-end gap-0.5 overflow-hidden"
            style={{ height: `${chartHeight}px` }}
          >
            {data.map((point, index) => {
              const revenueHeight = Math.max((point.revenue / maxRevenue) * chartHeight, 2);
              const ticketsHeight = Math.max((point.tickets / maxTickets) * chartHeight, 2);
              const date = new Date(point.date);

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-row items-end gap-px group relative"
                >
                  <div
                    className="flex-1 bg-[#59FFA0] rounded-t-sm hover:opacity-80 transition-opacity"
                    style={{ height: `${revenueHeight}px` }}
                  />
                  <div
                    className="flex-1 bg-[#007BFF] rounded-t-sm hover:opacity-80 transition-opacity"
                    style={{ height: `${ticketsHeight}px` }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-bold text-[#59FFA0]">${point.revenue.toFixed(2)}</div>
                    <div className="font-bold text-[#007BFF]">{point.tickets} tickets</div>
                    <div className="text-[#7DD8E8]">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
