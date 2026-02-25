'use client';

import { useMemo, useState } from 'react';

interface SalesDataPoint {
  date: string;
  revenue: number;
  count: number;
}

interface SalesChartProps {
  data: SalesDataPoint[];
}

export function SalesChart({ data }: SalesChartProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const maxRevenue = useMemo(() => {
    return Math.max(...data.map(d => d.revenue), 1);
  }, [data]);

  const chartHeight = 180;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-header font-bold text-white">
          📈 Revenue Trend (30 Days)
        </h3>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden p-1 text-gray-500 text-xs"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      <div className={isExpanded ? 'block' : 'hidden md:block'}>
        {data.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center gap-2">
            <div className="text-4xl">📊</div>
            <p className="text-gray-400 font-medium text-sm">No sales data yet</p>
            <p className="text-xs text-gray-500">Charts will appear once you have orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative flex items-end gap-0.5" style={{ height: `${chartHeight}px` }}>
              {data.map((point, index) => {
                const height = Math.max((point.revenue / maxRevenue) * chartHeight, 2);
                const date = new Date(point.date);

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-[#59FFA0] to-[#007BFF] rounded-t-sm hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ height: `${height}px` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-bold">${point.revenue.toFixed(2)}</div>
                      <div className="text-gray-400">{point.count} orders</div>
                      <div className="text-gray-500">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              {data.filter((_, i) => i % 5 === 0).map((point, index) => (
                <span key={index}>
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
