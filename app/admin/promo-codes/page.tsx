'use client';

import { useEffect, useState } from 'react';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  usage_limit: number | null;
  usage_count: number | null;
  valid_from: string | null;
  valid_until: string;
  status: string | null;
  audience_scope: {
    neighborhoods?: string[];
    vibes?: string[];
    age_ranges?: string[];
  } | null;
  event_id: string | null;
}

function ScopePills({ scope }: { scope: PromoCode['audience_scope'] }) {
  const neighborhoods = scope?.neighborhoods ?? [];
  const vibes = scope?.vibes ?? [];
  const hasScope = neighborhoods.length > 0 || vibes.length > 0;

  if (!hasScope) {
    return <span className="text-xs text-white/40 italic">All Users</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {neighborhoods.map((n) => (
        <span
          key={n}
          className="px-2 py-0.5 rounded-full text-xs border border-[#59FFA0]/30 text-[#59FFA0]/80 bg-[#59FFA0]/5"
        >
          {n.replace(/_/g, ' ')}
        </span>
      ))}
      {vibes.map((v) => (
        <span
          key={v}
          className="px-2 py-0.5 rounded-full text-xs border border-[#1AC8ED]/30 text-[#1AC8ED]/80 bg-[#1AC8ED]/5"
        >
          {v.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/admin/promo-codes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCodes(d.data ?? []);
        else setError(d.error ?? 'Failed to load promo codes');
      })
      .catch(() => setError('Failed to load promo codes'))
      .finally(() => setLoading(false));
  }, []);

  function handleCopy(id: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDiscount(type: 'percentage' | 'fixed', value: number) {
    return type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getStatus(code: PromoCode) {
    if (code.status && code.status !== 'active') return { label: 'Inactive', color: 'text-white/40 bg-white/5 border-white/10' };
    const now = new Date();
    const until = new Date(code.valid_until);
    if (until < now) return { label: 'Expired', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (code.usage_limit != null && (code.usage_count ?? 0) >= code.usage_limit) {
      return { label: 'Maxed', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    }
    return { label: 'Active', color: 'text-[#59FFA0] bg-[#59FFA0]/10 border-[#59FFA0]/20' };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-header font-bold text-white">Promo Codes</h1>
        <p className="text-sm text-[#7DD8E8] mt-1">Manage scoped promotional codes</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-12">
          <div className="w-5 h-5 border-2 border-[#59FFA0]/30 border-t-[#59FFA0] rounded-full animate-spin" />
          <span className="text-sm text-[#7DD8E8]">Loading promo codes…</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">No promo codes yet.</p>
          <p className="text-white/25 text-xs mt-1">
            Generate codes from the event creation page.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {['Code', 'Discount', 'Usage', 'Valid Until', 'Audience Scope', 'Status', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs text-[#7DD8E8] uppercase tracking-wider font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {codes.map((c) => {
                  const status = getStatus(c);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-white font-bold tracking-widest text-xs">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-white">
                        {formatDiscount(c.discount_type, c.discount_value)}
                      </td>
                      <td className="px-5 py-4 text-[#7DD8E8]">
                        {c.usage_count ?? 0}
                        {c.usage_limit != null ? `/${c.usage_limit}` : ''}
                      </td>
                      <td className="px-5 py-4 text-[#7DD8E8]">
                        {formatDate(c.valid_until)}
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <ScopePills scope={c.audience_scope} />
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleCopy(c.id, c.code)}
                          className="px-3 py-1.5 rounded-lg bg-[#1AC8ED]/10 border border-[#1AC8ED]/20 text-[#1AC8ED] text-xs font-medium hover:bg-[#1AC8ED]/20 transition-colors"
                        >
                          {copiedId === c.id ? 'Copied!' : 'Copy Code'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {codes.map((c) => {
              const status = getStatus(c);
              return (
                <div
                  key={c.id}
                  className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-white font-bold tracking-widest text-sm">
                      {c.code}
                    </span>
                    <span
                      className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">
                        Discount
                      </p>
                      <p className="text-white">{formatDiscount(c.discount_type, c.discount_value)}</p>
                    </div>
                    <div>
                      <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">
                        Usage
                      </p>
                      <p className="text-white">
                        {c.usage_count ?? 0}
                        {c.usage_limit != null ? `/${c.usage_limit}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#7DD8E8] uppercase tracking-wider font-medium mb-0.5">
                        Valid Until
                      </p>
                      <p className="text-white">{formatDate(c.valid_until)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[#7DD8E8] text-xs uppercase tracking-wider font-medium mb-1.5">
                      Audience Scope
                    </p>
                    <ScopePills scope={c.audience_scope} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(c.id, c.code)}
                    className="w-full py-2 rounded-lg bg-[#1AC8ED]/10 border border-[#1AC8ED]/20 text-[#1AC8ED] text-xs font-medium hover:bg-[#1AC8ED]/20 transition-colors"
                  >
                    {copiedId === c.id ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
