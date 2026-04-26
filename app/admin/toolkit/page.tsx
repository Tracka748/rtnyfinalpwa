'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolkitFeature {
  id: string;
  name: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

interface PromoterOption {
  id: string;
  display_name: string | null;
  status: string;
  user_email: string | null;
  user_name: string | null;
}

interface Grant {
  id: string;
  promoter_id: string;
  feature_id: string;
  unlock_type: string;
  unlocked_at: string;
  expires_at: string | null;
  granted_by: string | null;
  promoter_display_name: string;
  feature_name: string;
  feature_icon: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UnlockTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    admin_granted: 'bg-[#59FFA0]/15 text-[#59FFA0] border border-[#59FFA0]/30',
    purchased: 'bg-[#1AC8ED]/15 text-[#1AC8ED] border border-[#1AC8ED]/30',
    subscription: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  };
  const labels: Record<string, string> = {
    admin_granted: 'Admin Grant',
    purchased: 'Purchased',
    subscription: 'Subscription',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type] ?? 'bg-white/10 text-[#7DD8E8] border border-white/15'}`}>
      {labels[type] ?? type}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function TableSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminToolkitPage() {
  const [features, setFeatures] = useState<ToolkitFeature[]>([]);
  const [promoters, setPromoters] = useState<PromoterOption[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);

  // Grant form state
  const [search, setSearch] = useState('');
  const [selectedPromoter, setSelectedPromoter] = useState<PromoterOption | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/toolkit/grants');
      const json = await res.json();
      if (json.success) {
        setGrants(json.data.grants);
        setFeatures(json.data.features.filter((f: ToolkitFeature) => f.is_active));
        setPromoters(json.data.promoters);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPromoters = search.trim().length > 0
    ? promoters.filter(p => {
        const q = search.toLowerCase();
        return (
          p.display_name?.toLowerCase().includes(q) ||
          p.user_email?.toLowerCase().includes(q) ||
          p.user_name?.toLowerCase().includes(q)
        );
      })
    : promoters;

  async function handleGrant() {
    if (!selectedPromoter || !selectedFeatureId) return;
    setGrantLoading(true);
    setGrantError(null);
    setGrantSuccess(null);
    try {
      const res = await fetch('/api/v1/promoter/toolkit/admin-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoter_id: selectedPromoter.id, feature_id: selectedFeatureId }),
      });
      const json = await res.json();
      if (!json.success) {
        setGrantError(json.error || 'Failed to grant feature');
        return;
      }
      const featureName = features.find(f => f.id === selectedFeatureId)?.name ?? selectedFeatureId;
      setGrantSuccess(`${featureName} granted to ${selectedPromoter.display_name ?? selectedPromoter.user_email}`);
      setSelectedPromoter(null);
      setSelectedFeatureId('');
      setSearch('');
      await loadData();
    } catch {
      setGrantError('Something went wrong. Please try again.');
    } finally {
      setGrantLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* ── HEADER ── */}
      <div>
        <h1 className="text-3xl font-header font-bold text-white">🔧 Toolkit Management</h1>
        <p className="text-[#7DD8E8] mt-1">Grant feature access to promoters and review all unlocks</p>
      </div>

      {/* ── GRANT FORM ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-header font-bold text-white mb-5">Grant Feature Access</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Promoter search */}
          <div ref={searchRef} className="relative">
            <label className="block text-xs font-medium text-[#7DD8E8] uppercase tracking-wider mb-2">
              Promoter
            </label>
            {selectedPromoter ? (
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">{selectedPromoter.display_name ?? selectedPromoter.user_name ?? 'Unnamed'}</p>
                  {selectedPromoter.user_email && (
                    <p className="text-xs text-[#7DD8E8]/60">{selectedPromoter.user_email}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedPromoter(null); setSearch(''); }}
                  className="text-[#7DD8E8]/60 hover:text-white transition-colors ml-3 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or email…"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                />
                {showDropdown && filteredPromoters.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-[#1a1a1d] border border-white/15 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {filteredPromoters.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPromoter(p); setSearch(''); setShowDropdown(false); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#1AC8ED]/20 border border-[#1AC8ED]/30 flex items-center justify-center text-xs font-bold text-[#1AC8ED] shrink-0 mt-0.5">
                          {(p.display_name ?? p.user_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {p.display_name ?? p.user_name ?? 'Unnamed'}
                          </p>
                          {p.user_email && (
                            <p className="text-xs text-[#7DD8E8]/60 truncate">{p.user_email}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && search.trim().length > 0 && filteredPromoters.length === 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-[#1a1a1d] border border-white/15 rounded-lg px-4 py-3 text-sm text-[#7DD8E8]/60">
                    No promoters found
                  </div>
                )}
              </>
            )}
          </div>

          {/* Feature dropdown */}
          <div>
            <label className="block text-xs font-medium text-[#7DD8E8] uppercase tracking-wider mb-2">
              Feature
            </label>
            <select
              value={selectedFeatureId}
              onChange={e => setSelectedFeatureId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors appearance-none"
            >
              <option value="" className="bg-[#1a1a1d]">Select a feature…</option>
              {features.map(f => (
                <option key={f.id} value={f.id} className="bg-[#1a1a1d]">
                  {f.icon} {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback */}
        {grantSuccess && (
          <div className="mb-4 px-4 py-3 bg-[#59FFA0]/10 border border-[#59FFA0]/20 rounded-lg text-sm text-[#59FFA0]">
            ✅ {grantSuccess}
          </div>
        )}
        {grantError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {grantError}
          </div>
        )}

        <button
          onClick={handleGrant}
          disabled={!selectedPromoter || !selectedFeatureId || grantLoading}
          className="px-6 py-2.5 bg-[#59FFA0] text-black font-semibold rounded-lg hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-2"
        >
          {grantLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Granting…
            </>
          ) : (
            '🔓 Grant Access'
          )}
        </button>
      </div>

      {/* ── GRANTS TABLE ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-header font-bold text-white">Current Grants</h2>
          <span className="text-xs text-[#7DD8E8]/60">{grants.length} total</span>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : grants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="text-3xl block mb-3">🔒</span>
            <p className="text-[#7DD8E8] text-sm">No features have been unlocked yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Promoter', 'Feature', 'Unlock Type', 'Granted At', 'Expires'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#7DD8E8]/70 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {grants.map(g => (
                  <tr key={g.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 text-white font-medium whitespace-nowrap">
                      {g.promoter_display_name}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-2 text-[#7DD8E8]">
                        <span>{g.feature_icon}</span>
                        {g.feature_name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <UnlockTypeBadge type={g.unlock_type} />
                    </td>
                    <td className="px-5 py-3 text-[#7DD8E8]/70 whitespace-nowrap">
                      {fmtDate(g.unlocked_at)}
                    </td>
                    <td className="px-5 py-3 text-[#7DD8E8]/70 whitespace-nowrap">
                      {g.expires_at ? fmtDate(g.expires_at) : <span className="text-white/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
