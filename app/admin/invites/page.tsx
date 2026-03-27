'use client';

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InviteRun {
  id: string;
  event_id: string;
  sent_count: number;
  target_neighborhoods: string[];
  target_vibes: string[];
  target_age_ranges: string[];
  created_at: string;
  event: { id: string; name: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function pillLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function TagList({ items, color }: { items: string[]; color: 'cyan' | 'mint' }) {
  if (items.length === 0) return <span className="text-white/30 text-xs">—</span>;
  const cls =
    color === 'cyan'
      ? 'bg-[#1AC8ED]/10 text-[#1AC8ED] border-[#1AC8ED]/30'
      : 'bg-[#59FFA0]/10 text-[#59FFA0] border-[#59FFA0]/30';
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>
          {pillLabel(item)}
        </span>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminInvitesPage() {
  const [runs, setRuns] = useState<InviteRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/admin/invites')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRuns(d.data.invite_runs);
        else setError(d.error ?? 'Failed to load invite runs');
      })
      .catch(() => setError('Failed to load invite runs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-header font-bold text-white">Invite Runs</h1>
          <p className="text-sm text-[#7DD8E8] mt-0.5">
            To send invites, go to an{' '}
            <a href="/admin/events" className="text-[#59FFA0] hover:underline">
              event detail page
            </a>
            .
          </p>
        </div>
        {!loading && !error && runs.length > 0 && (
          <span className="text-xs text-[#7DD8E8]">
            {runs.length} run{runs.length !== 1 ? 's' : ''} total
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-white/5 rounded-lg" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-[#1a1a1c] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✉️</div>
          <p className="text-white font-medium mb-1">No invite runs yet</p>
          <p className="text-sm text-[#7DD8E8]">
            Send your first invite from an{' '}
            <a href="/admin/events" className="text-[#59FFA0] hover:underline">
              event page
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1a1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-xs text-[#7DD8E8] font-medium px-5 py-3">
                    Event
                  </th>
                  <th className="text-left text-xs text-[#7DD8E8] font-medium px-4 py-3 whitespace-nowrap">
                    Date Sent
                  </th>
                  <th className="text-left text-xs text-[#7DD8E8] font-medium px-4 py-3 whitespace-nowrap">
                    Recipients
                  </th>
                  <th className="text-left text-xs text-[#7DD8E8] font-medium px-4 py-3 hidden md:table-cell">
                    Neighborhoods
                  </th>
                  <th className="text-left text-xs text-[#7DD8E8] font-medium px-4 py-3 pr-5 hidden md:table-cell">
                    Vibes
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[#2a2a2a]/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4">
                      {run.event ? (
                        <a
                          href={`/admin/events/${run.event.id}`}
                          className="text-white font-medium hover:text-[#59FFA0] transition-colors"
                        >
                          {run.event.name}
                        </a>
                      ) : (
                        <span className="text-white/40 italic text-xs">Deleted event</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-white/70 whitespace-nowrap">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-[#59FFA0]">
                        {run.sent_count.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <TagList items={run.target_neighborhoods} color="cyan" />
                    </td>
                    <td className="px-4 py-4 pr-5 hidden md:table-cell">
                      <TagList items={run.target_vibes} color="mint" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
