'use client';

import { useState, useEffect } from 'react';

interface Pitch {
  id: string;
  group_id: string;
  group_name: string | null;
  organizer_id: string;
  title: string;
  description: string;
  category: string;
  date_start: string;
  date_end: string;
  price_min: number;
  price_max: number;
  preferred_locations: string[] | null;
  ideas_details: string | null;
  interest_count: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type PitchStatus = 'active' | 'closed' | 'converted';

const VALID_STATUSES: PitchStatus[] = ['active', 'closed', 'converted'];

const STATUS_BADGE: Record<PitchStatus, string> = {
  active: 'bg-[#59FFA0]/15 text-[#59FFA0] border border-[#59FFA0]/25',
  closed: 'bg-white/10 text-white/50 border border-white/15',
  converted: 'bg-[#1AC8ED]/15 text-[#1AC8ED] border border-[#1AC8ED]/25',
};

const STATUS_LABEL: Record<PitchStatus, string> = {
  active: 'Active',
  closed: 'Closed',
  converted: 'Converted',
};

function normalizeStatus(status: string | null): PitchStatus {
  if (status === 'active' || status === 'closed' || status === 'converted') return status;
  return 'active';
}

function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 bg-white/10 rounded w-2/3" />
        <div className="h-6 bg-white/10 rounded-full w-20" />
      </div>
      <div className="h-3 bg-white/10 rounded w-1/3" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
    </div>
  );
}

export default function OrganizerPitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/organizer/pitches');
        if (res.ok) {
          const data = await res.json();
          setPitches(data.data ?? []);
        }
      } catch (err) {
        console.error('[organizer/pitches] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleStatusChange(pitchId: string, newStatus: PitchStatus) {
    setUpdatingId(pitchId);

    // Optimistic update
    setPitches((prev) =>
      prev.map((p) => (p.id === pitchId ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/v1/organizer/pitches/${pitchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to update pitch status.');
        // Revert on failure — re-fetch
        const refreshRes = await fetch('/api/v1/organizer/pitches');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setPitches(refreshData.data ?? []);
        }
      }
    } catch (err) {
      console.error('[organizer/pitches] status update error:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-slab-serif font-bold text-white">Event Pitches</h1>
        <p className="text-[#7DD8E8] mt-1 text-sm font-sans">
          Review and manage event pitches submitted to your groups.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : pitches.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-4xl mb-4 block">🎯</span>
          <h3 className="text-lg font-semibold text-white mb-2">No event pitches yet</h3>
          <p className="text-[#7DD8E8] text-sm font-sans">
            No event pitches yet for your groups.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pitches.map((pitch) => {
            const status = normalizeStatus(pitch.status);
            const isUpdating = updatingId === pitch.id;

            return (
              <div
                key={pitch.id}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-base font-semibold text-white font-sans">
                        {pitch.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label whitespace-nowrap ${STATUS_BADGE[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-sans text-[#7DD8E8]">
                      {pitch.group_name && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#1AC8ED] font-label">
                          {pitch.group_name}
                        </span>
                      )}
                      <span>{pitch.category}</span>
                      <span>
                        {new Date(pitch.date_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' – '}
                        {new Date(pitch.date_end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {(pitch.interest_count ?? 0) > 0 && (
                        <span className="text-[#59FFA0]">
                          ❤️ {pitch.interest_count} interested
                        </span>
                      )}
                      {pitch.created_at && (
                        <span className="text-white/30">
                          Posted{' '}
                          {new Date(pitch.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {pitch.description && (
                      <p className="mt-2 text-sm text-white/60 font-sans line-clamp-2">
                        {pitch.description}
                      </p>
                    )}
                  </div>

                  {/* Right: status dropdown */}
                  <div className="shrink-0">
                    <label className="block text-xs font-label text-[#7DD8E8] mb-1 uppercase tracking-wide">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        handleStatusChange(pitch.id, e.target.value as PitchStatus)
                      }
                      disabled={isUpdating}
                      className="bg-white/5 border border-white/15 text-white rounded-lg px-3 py-1.5 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {VALID_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[#0E0E10]">
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    {isUpdating && (
                      <p className="text-xs text-[#7DD8E8] mt-1 font-sans">Saving…</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
