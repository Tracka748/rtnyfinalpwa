'use client';

import { useState } from 'react';

interface TopEvent {
  id: string;
  name: string;
  tickets_sold: number;
  revenue: number;
}

interface TopEventsChartProps {
  events: TopEvent[];
}

const medals = ['🥇', '🥈', '🥉', '🎯', '🎯'];

export function TopEventsChart({ events }: TopEventsChartProps) {
  // Collapsed by default on mobile (secondary chart)
  const [isExpanded, setIsExpanded] = useState(false);

  const topEvents = [...events].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxRevenue = Math.max(...topEvents.map(e => e.revenue), 1);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-header font-bold text-white">
          Top 5 Events by Revenue
        </h3>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden p-1 text-[#7DD8E8] text-xs"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      <div className={isExpanded ? 'block' : 'hidden md:block'}>
        {topEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
            <div className="text-3xl">🏆</div>
            <p className="text-[#7DD8E8] text-sm font-medium">No events yet</p>
            <p className="text-xs text-[#7DD8E8]">Top performers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topEvents.map((event, index) => {
              const percentage = (event.revenue / maxRevenue) * 100;

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{medals[index]}</span>
                      <a
                        href={`/admin/events/${event.id}`}
                        className="text-white font-medium truncate hover:text-[#59FFA0] transition-colors"
                      >
                        {event.name}
                      </a>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[#59FFA0] font-bold">
                        ${event.revenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#7DD8E8]">
                        {event.tickets_sold} tickets
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#59FFA0] to-[#007BFF] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
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
