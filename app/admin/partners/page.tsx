'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

interface Partner {
  id: string;
  display_name: string;
  partner_type: string;
  verified: boolean;
  active: boolean;
  supporter_count: number;
  created_at: string;
  venue_id: string | null;
  vendor_id: string | null;
  logo_url: string | null;
  tagline: string | null;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  venue:    { bg: 'bg-[#007BFF]/20', text: 'text-[#007BFF]', border: 'border-[#007BFF]/30' },
  vendor:   { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  brand:    { bg: 'bg-[#EF9F27]/20', text: 'text-[#EF9F27]', border: 'border-[#EF9F27]/30' },
  promoter: { bg: 'bg-[#59FFA0]/20', text: 'text-[#59FFA0]', border: 'border-[#59FFA0]/30' },
};

function typeBadge(type: string) {
  const c = TYPE_COLORS[type] ?? { bg: 'bg-white/10', text: 'text-[#7DD8E8]', border: 'border-white/20' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}>
      {type}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    try {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      const { data, error: err } = await supabase
        .from('partners')
        .select('id, display_name, partner_type, verified, active, supporter_count, created_at, venue_id, vendor_id, logo_url, tagline')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setPartners(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(partner: Partner) {
    try {
      setToggling(partner.id);
      const res = await fetch(`/api/v1/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !partner.active }),
      });
      const data = await res.json();
      if (data.success) {
        setPartners(prev =>
          prev.map(p => (p.id === partner.id ? { ...p, active: !p.active } : p))
        );
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    } finally {
      setToggling(null);
    }
  }

  const filtered = partners.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSupporters = partners.reduce((sum, p) => sum + (p.supporter_count || 0), 0);
  const verifiedCount = partners.filter(p => p.verified).length;
  const activeCount = partners.filter(p => p.active).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Failed to load partners: {error}</p>
        <button
          type="button"
          onClick={fetchPartners}
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-header font-bold text-white mb-1">
            Partner Profiles
          </h1>
          <p className="text-sm text-[#7DD8E8]">Manage RTNY business and venue partner profiles</p>
        </div>
        <a
          href="/admin/partners/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30 rounded-lg text-sm font-medium hover:bg-[#59FFA0]/30 transition-colors self-start md:self-auto"
        >
          + Create Partner
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
          <p className="text-xs text-[#7DD8E8] mb-1">Total Partners</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{partners.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
          <p className="text-xs text-[#7DD8E8] mb-1">Verified</p>
          <p className="text-2xl md:text-3xl font-bold text-[#59FFA0]">{verifiedCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
          <p className="text-xs text-[#7DD8E8] mb-1">Active</p>
          <p className="text-2xl md:text-3xl font-bold text-[#007BFF]">{activeCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
          <p className="text-xs text-[#7DD8E8] mb-1">Total Supporters</p>
          <p className="text-2xl md:text-3xl font-bold text-[#EF9F27]">{totalSupporters.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-80 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#7A7978] focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
        />
      </div>

      {/* Partner list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-[#7A7978] text-sm py-8 text-center">
            {search ? 'No partners match your search.' : 'No partners found.'}
          </p>
        )}
        {filtered.map(partner => (
          <div
            key={partner.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            {/* Logo / Avatar */}
            <div className="shrink-0">
              {partner.logo_url ? (
                <img
                  src={partner.logo_url}
                  alt={partner.display_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#59FFA0]">
                    {partner.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-white text-sm truncate">
                  {partner.display_name}
                </span>
                {typeBadge(partner.partner_type)}
                {partner.verified ? (
                  <span className="text-xs text-[#59FFA0] font-medium">✓ Verified</span>
                ) : (
                  <span className="text-xs text-[#7A7978]">Unverified</span>
                )}
                <span className="flex items-center gap-1 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${partner.active ? 'bg-[#59FFA0]' : 'bg-red-400'}`} />
                  <span className={partner.active ? 'text-[#59FFA0]' : 'text-red-400'}>
                    {partner.active ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
              {partner.tagline && (
                <p className="text-xs text-[#7DD8E8] truncate">{partner.tagline}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#7A7978]">
                  {partner.supporter_count || 0} supporter{(partner.supporter_count || 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-[#7A7978]">{formatDate(partner.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/partners/${partner.id}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                View
              </a>
              <a
                href={`/admin/partners/${partner.id}/edit`}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#007BFF]/20 border border-[#007BFF]/30 text-[#007BFF] hover:bg-[#007BFF]/30 transition-colors"
              >
                Edit
              </a>
              <button
                type="button"
                disabled={toggling === partner.id}
                onClick={() => toggleActive(partner)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  partner.active
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0] hover:bg-[#59FFA0]/20'
                }`}
              >
                {toggling === partner.id ? '...' : partner.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
