import { ReactNode } from 'react';

interface ActivityItem {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  events: { name: string } | null;
  users: { email: string } | null;
}

interface RecentActivityProps {
  items: ActivityItem[];
  exportButton?: ReactNode;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const statusClass = (status: string) =>
  status === 'completed'
    ? 'bg-green-500/20 text-green-300'
    : 'bg-yellow-500/20 text-yellow-300';

export function RecentActivity({ items, exportButton }: RecentActivityProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-header font-bold text-white">
          🕐 Recent Orders
        </h3>
        {exportButton}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
          <div className="text-4xl">📭</div>
          <p className="text-gray-400 font-medium">No recent orders</p>
          <p className="text-sm text-gray-500">Check back soon for activity</p>
        </div>
      ) : (
        <>
          {/* Mobile: card view */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {item.events?.name || 'Unknown Event'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {item.users?.email || 'Guest'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${statusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                  <span className="text-base font-bold text-[#59FFA0]">
                    ${item.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: row view */}
          <div className="hidden md:block space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">
                      {item.events?.name || 'Unknown Event'}
                    </span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {item.users?.email || 'Guest'}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <div className="text-lg font-bold text-[#59FFA0]">
                    ${item.total_amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(item.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
