'use client';

import { useEffect, useState, useCallback } from 'react';

interface AudienceData {
  total_users: number;
  neighborhoods: Record<string, number>;
  age_ranges: Record<string, number>;
  gender: Record<string, number>;
  is_parent: { parent: number; non_parent: number };
  vibe_tags: Record<string, number>;
  activity_levels: Record<string, number>;
  purchase_patterns: Record<string, number>;
  preferred_event_times: Record<string, number>;
  avg_platform_spend: number;
}

// Tailwind class maps — avoids inline style for color
const ACTIVITY_DOT: Record<string, string> = {
  high: 'bg-[#59FFA0]',
  medium: 'bg-[#1AC8ED]',
  low: 'bg-[#FFD166]',
  dormant: 'bg-[#6b6b6b]',
};
const ACTIVITY_TEXT: Record<string, string> = {
  high: 'text-[#59FFA0]',
  medium: 'text-[#1AC8ED]',
  low: 'text-[#FFD166]',
  dormant: 'text-[#6b6b6b]',
};
const RANK_DOT = ['bg-[#59FFA0]', 'bg-[#1AC8ED]', 'bg-[#6b6b6b]'];
const RANK_TEXT = ['text-[#59FFA0]', 'text-[#1AC8ED]', 'text-[#6b6b6b]'];

function maxVal(obj: Record<string, number>) {
  return Math.max(...Object.values(obj), 1);
}

function topKey(obj: Record<string, number>): string {
  return Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function HeroCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-[#7DD8E8] uppercase tracking-widest font-medium">{label}</p>
      <p className={`text-2xl font-header font-bold leading-tight ${accent ? 'text-[#59FFA0]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

// Bar width is set via CSS custom property to avoid backgroundColor inline style
function BarRow({
  label,
  count,
  max,
  barClass = 'bg-[#59FFA0]',
}: {
  label: string;
  count: number;
  max: number;
  barClass?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-white/70 w-32 shrink-0">{formatLabel(label)}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
        {/* width must be dynamic — acceptable single inline style for data-driven sizing */}
        {/* biome-ignore lint/style/noInlineStyle: dynamic bar width requires inline style */}
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-white/60 w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-header font-bold text-white text-lg mb-4">{children}</h2>;
}

export default function AudiencePage() {
  const [data, setData] = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/audience-overview');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.error ?? 'Unknown error');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audience data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await fetch('/api/v1/admin/behavior-snapshot', { method: 'POST' });
      await fetchData();
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/30 rounded-lg text-sm hover:bg-[#59FFA0]/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const topNeighborhood = topKey(data.neighborhoods);
  const topVibe = topKey(data.vibe_tags);
  const neighborhoodMax = maxVal(data.neighborhoods);
  const ageMax = maxVal(data.age_ranges);
  const genderMax = maxVal(data.gender);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-header font-bold text-white text-2xl">Audience Intelligence</h1>
          <p className="text-sm text-white/40 mt-0.5">Platform-wide user breakdown</p>
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/30 rounded-xl text-sm font-medium hover:bg-[#59FFA0]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recalculating ? (
            <>
              <span className="w-3.5 h-3.5 border border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
              Recalculating…
            </>
          ) : (
            <>
              <span>↻</span>
              Recalculate
            </>
          )}
        </button>
      </div>

      {/* Section 1 — Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HeroCard label="Total Users" value={data.total_users} accent />
        <HeroCard label="Avg Platform Spend" value={`$${data.avg_platform_spend.toFixed(2)}`} />
        <HeroCard label="Top Neighborhood" value={formatLabel(topNeighborhood)} />
        <HeroCard label="Top Vibe" value={formatLabel(topVibe)} />
      </div>

      {/* Section 2 — Neighborhoods */}
      <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
        <SectionTitle>Neighborhoods</SectionTitle>
        <div className="space-y-0.5">
          {Object.entries(data.neighborhoods)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <BarRow key={key} label={key} count={count} max={neighborhoodMax} />
            ))}
        </div>
      </div>

      {/* Section 3 — Vibe Tags */}
      <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
        <SectionTitle>Vibe Tags</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.vibe_tags)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count], i) => {
              const isTop = i === 0;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                    isTop
                      ? 'bg-[#59FFA0]/10 text-[#59FFA0] border-[#59FFA0]/30'
                      : count > 0
                        ? 'bg-[#1AC8ED]/10 text-[#1AC8ED] border-[#1AC8ED]/20'
                        : 'bg-white/5 text-white/30 border-white/10'
                  }`}
                >
                  {formatLabel(key)}
                  <span
                    className={`text-xs font-bold ${
                      isTop ? 'text-[#59FFA0]' : count > 0 ? 'text-[#1AC8ED]' : 'text-white/20'
                    }`}
                  >
                    {count}
                  </span>
                </span>
              );
            })}
        </div>
      </div>

      {/* Section 4 — Behavior Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Activity Level */}
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
          <SectionTitle>Activity Level</SectionTitle>
          <div className="space-y-3">
            {Object.entries(data.activity_levels)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ACTIVITY_DOT[key] ?? 'bg-[#6b6b6b]'}`} />
                  <span className="text-sm text-white/70 flex-1">{formatLabel(key)}</span>
                  <span className={`text-sm font-bold ${ACTIVITY_TEXT[key] ?? 'text-[#6b6b6b]'}`}>{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Purchase Pattern */}
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
          <SectionTitle>Purchase Pattern</SectionTitle>
          <div className="space-y-3">
            {Object.entries(data.purchase_patterns)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count], i) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${RANK_DOT[i] ?? 'bg-[#6b6b6b]'}`} />
                  <span className="text-sm text-white/70 flex-1">{formatLabel(key)}</span>
                  <span className={`text-sm font-bold ${RANK_TEXT[i] ?? 'text-[#6b6b6b]'}`}>{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Preferred Event Time */}
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
          <SectionTitle>Preferred Event Time</SectionTitle>
          <div className="space-y-3">
            {Object.entries(data.preferred_event_times)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count], i) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${RANK_DOT[i] ?? 'bg-[#6b6b6b]'}`} />
                  <span className="text-sm text-white/70 flex-1">{formatLabel(key)}</span>
                  <span className={`text-sm font-bold ${RANK_TEXT[i] ?? 'text-[#6b6b6b]'}`}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Section 5 — Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
          <SectionTitle>Age Range</SectionTitle>
          <div className="space-y-0.5">
            {Object.entries(data.age_ranges)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <BarRow key={key} label={key} count={count} max={ageMax} barClass="bg-[#1AC8ED]" />
              ))}
          </div>
        </div>

        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-5">
          <SectionTitle>Gender</SectionTitle>
          <div className="space-y-0.5">
            {Object.entries(data.gender)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <BarRow key={key} label={key} count={count} max={genderMax} barClass="bg-[#1AC8ED]" />
              ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-white/30 text-center leading-relaxed">
        Data reflects users who completed profile setup.
        Run Recalculate to refresh behavior data from latest orders.
      </p>
    </div>
  );
}
