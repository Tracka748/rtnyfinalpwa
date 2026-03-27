'use client';

import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  name: string;
  event_date: string;
  status: string;
  category: string;
  total_tickets: number | null;
  tickets_sold: number | null;
  featured: boolean | null;
  target_neighborhoods: string[] | null;
  target_vibes: string[] | null;
  venue_id: string | null;
  venue_name?: string;
}

interface Venue {
  id: string;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pillLabel(value: string) {
  return value.replace(/_/g, ' ');
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active:    { bg: 'bg-[#59FFA0]/10', text: 'text-[#59FFA0]',  border: 'border-[#59FFA0]/30', label: 'Active' },
  cancelled: { bg: 'bg-red-500/10',   text: 'text-red-400',    border: 'border-red-500/30',   label: 'Cancelled' },
  sold_out:  { bg: 'bg-[#1AC8ED]/10', text: 'text-[#1AC8ED]',  border: 'border-[#1AC8ED]/30', label: 'Sold Out' },
  postponed: { bg: 'bg-yellow-500/10',text: 'text-yellow-400', border: 'border-yellow-500/30',label: 'Postponed' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? {
    bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10', label: status,
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border} capitalize whitespace-nowrap`}
    >
      {s.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium border bg-[#7DD8E8]/10 text-[#7DD8E8] border-[#7DD8E8]/20 capitalize whitespace-nowrap">
      {pillLabel(category)}
    </span>
  );
}

function AudiencePills({
  neighborhoods,
  vibes,
}: {
  neighborhoods: string[];
  vibes: string[];
}) {
  const all = [
    ...neighborhoods.map((n) => ({ label: n, color: 'cyan' as const })),
    ...vibes.map((v) => ({ label: v, color: 'mint' as const })),
  ];

  if (all.length === 0) {
    return <span className="text-xs text-white/30 italic">All users</span>;
  }

  const visible = all.slice(0, 3);
  const overflow = all.length - 3;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((p) => (
        <span
          key={p.label}
          className={`px-2 py-0.5 rounded-full text-xs border ${
            p.color === 'cyan'
              ? 'bg-[#1AC8ED]/10 border-[#1AC8ED]/30 text-[#1AC8ED]'
              : 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0]'
          }`}
        >
          {pillLabel(p.label)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="px-2 py-0.5 rounded-full text-xs border bg-white/5 border-white/10 text-white/40">
          +{overflow} more
        </span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/v1/admin/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const venueMap: Record<string, string> = {};
          (d.data.venues as Venue[]).forEach((v) => {
            venueMap[v.id] = v.name;
          });
          const merged: Event[] = (d.data.events as Event[]).map((e) => ({
            ...e,
            venue_name: e.venue_id ? (venueMap[e.venue_id] ?? 'Unknown venue') : 'TBA',
          }));
          setEvents(merged);
        } else {
          setError(d.error ?? 'Failed to load events');
        }
      })
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? events.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    : events;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-header font-bold text-white">Live Events</h1>
          <p className="text-sm text-[#7DD8E8] mt-0.5">Manage published events on the platform</p>
        </div>
        <a
          href="/admin/events/create"
          className="shrink-0 px-4 py-2.5 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors text-sm"
        >
          + Create Event
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by name…"
          className="w-full bg-[#1a1a1d] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#59FFA0]/40 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-12">
          <div className="w-5 h-5 border-2 border-[#59FFA0]/30 border-t-[#59FFA0] rounded-full animate-spin" />
          <span className="text-sm text-[#7DD8E8]">Loading events…</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">No events found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {['Event', 'Venue', 'Date', 'Category', 'Status', 'Tickets', 'Audience', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs text-[#7DD8E8] uppercase tracking-wider font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 max-w-[200px]">
                      <a
                        href={`/admin/events/${event.id}`}
                        className="text-white font-medium hover:text-[#59FFA0] transition-colors line-clamp-2"
                      >
                        {event.name}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-[#7DD8E8] whitespace-nowrap">
                      {event.venue_name}
                    </td>
                    <td className="px-5 py-4 text-[#7DD8E8] whitespace-nowrap">
                      {formatDate(event.event_date)}
                    </td>
                    <td className="px-5 py-4">
                      <CategoryBadge category={event.category} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-5 py-4 text-[#7DD8E8] whitespace-nowrap">
                      {event.total_tickets != null ? (
                        <>
                          <span className="text-white font-medium">{event.tickets_sold ?? 0}</span>
                          {' / '}
                          {event.total_tickets}
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <AudiencePills
                        neighborhoods={event.target_neighborhoods ?? []}
                        vibes={event.target_vibes ?? []}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={`/admin/events/${event.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#1AC8ED]/10 border border-[#1AC8ED]/20 text-[#1AC8ED] text-xs font-medium hover:bg-[#1AC8ED]/20 transition-colors whitespace-nowrap"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`/admin/events/${event.id}`}
                    className="text-white font-medium hover:text-[#59FFA0] transition-colors"
                  >
                    {event.name}
                  </a>
                  <StatusBadge status={event.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">Venue</p>
                    <p className="text-white">{event.venue_name}</p>
                  </div>
                  <div>
                    <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">Date</p>
                    <p className="text-white">{formatDate(event.event_date)}</p>
                  </div>
                  <div>
                    <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">Category</p>
                    <CategoryBadge category={event.category} />
                  </div>
                  <div>
                    <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">Tickets</p>
                    <p className="text-white">
                      {event.total_tickets != null ? (
                        <>{event.tickets_sold ?? 0} / {event.total_tickets}</>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[#7DD8E8] text-xs uppercase tracking-wider font-medium mb-1.5">
                    Audience
                  </p>
                  <AudiencePills
                    neighborhoods={event.target_neighborhoods ?? []}
                    vibes={event.target_vibes ?? []}
                  />
                </div>

                <a
                  href={`/admin/events/${event.id}`}
                  className="block w-full py-2 text-center rounded-lg bg-[#1AC8ED]/10 border border-[#1AC8ED]/20 text-[#1AC8ED] text-xs font-medium hover:bg-[#1AC8ED]/20 transition-colors"
                >
                  View Event
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
