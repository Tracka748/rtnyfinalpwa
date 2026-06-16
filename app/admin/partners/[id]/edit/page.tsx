'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

// ── Types ────────────────────────────────────────────────────────────────────

interface Venue {
  id: string;
  name: string;
  address: string;
}

interface Vendor {
  id: string;
  name: string;
  location: string | null;
  type: string | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface Modules {
  about: boolean;
  upcoming_events: boolean;
  gallery: boolean;
  rewards_offers: boolean;
  plan_your_event: boolean;
  activity_feed: boolean;
  experiences: boolean;
}

const PARTNER_TYPES = ['venue', 'promoter', 'organizer', 'vendor'] as const;

const MODULE_ROWS: { key: keyof Modules; label: string }[] = [
  { key: 'about',           label: 'About' },
  { key: 'upcoming_events', label: 'Upcoming Events' },
  { key: 'gallery',         label: 'Gallery' },
  { key: 'rewards_offers',  label: 'Rewards & Offers' },
  { key: 'plan_your_event', label: 'Plan Your Event' },
  { key: 'activity_feed',   label: 'Activity Feed' },
  { key: 'experiences',     label: 'Experiences' },
];

const DEFAULT_MODULES: Modules = {
  about: true,
  upcoming_events: true,
  gallery: false,
  rewards_offers: false,
  plan_your_event: false,
  activity_feed: false,
  experiences: false,
};

// ── Sub-components ───────────────────────────────────────────────────────────

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize',
        selected
          ? 'bg-[#59FFA0]/20 border-[#59FFA0] text-[#59FFA0]'
          : 'border-white/20 text-[#7DD8E8] hover:border-white/40',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        value ? 'bg-[#59FFA0]' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function SearchDropdown<T>({
  label,
  placeholder,
  items,
  searchValue,
  onSearchChange,
  getKey,
  getPrimary,
  getSecondary,
  onSelect,
  linked,
  onClear,
}: {
  label: string;
  placeholder: string;
  items: T[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  getKey: (item: T) => string;
  getPrimary: (item: T) => string;
  getSecondary: (item: T) => string;
  onSelect: (item: T) => void;
  linked: string | null;
  onClear: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const filtered = searchValue.length > 0
    ? items.filter(item =>
        getPrimary(item).toLowerCase().includes(searchValue.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (linked) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">{label}</label>
        <div className="flex items-center justify-between bg-white/5 border border-[#59FFA0]/30 rounded-lg px-4 py-2.5">
          <span className="text-sm text-[#59FFA0]">✓ Linked: {linked}</span>
          <button type="button" onClick={onClear} className="text-xs text-[#7DD8E8] hover:text-white transition-colors">
            × Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">{label}</label>
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={e => { onSearchChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-[#1a1a1d] border border-white/10 rounded-lg overflow-hidden shadow-xl">
            {filtered.map(item => (
              <button
                key={getKey(item)}
                type="button"
                onMouseDown={() => { onSelect(item); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-sm text-white">{getPrimary(item)}</span>
                <span className="text-xs text-[#7DD8E8]">{getSecondary(item)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminEditPartnerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Partner type
  const [partnerType, setPartnerType] = useState('');

  // Venue link
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueSearch, setVenueSearch] = useState('');
  const [linkedVenueName, setLinkedVenueName] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  // Vendor link
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [linkedVendorName, setLinkedVendorName] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [verified, setVerified] = useState(false);

  // Modules
  const [modules, setModules] = useState<Modules>({ ...DEFAULT_MODULES });

  // Owner
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [linkedOwnerEmail, setLinkedOwnerEmail] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Submit / danger zone
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    setNotFound(false);

    try {
      const supabase = createBrowserSupabaseClient();

      const [partnerRes, venuesRes, vendorsRes, usersRes] = await Promise.all([
        supabase.from('partners').select('*').eq('id', id).single(),
        fetch('/api/v1/venues').then(r => r.json()),
        supabase.from('vendors').select('id, name, location, type'),
        supabase.from('profiles').select('id, first_name, last_name, email').limit(200),
      ]);

      if (partnerRes.error || !partnerRes.data) {
        setNotFound(true);
        return;
      }

      const p = partnerRes.data;
      const venueList: Venue[] = venuesRes.success ? venuesRes.data : [];
      const vendorList: Vendor[] = vendorsRes.data ?? [];
      const userList: UserProfile[] = usersRes.data ?? [];

      setVenues(venueList);
      setVendors(vendorList);
      setUsers(userList);

      // Pre-populate form fields
      setPartnerType(p.partner_type ?? '');
      setDisplayName(p.display_name ?? '');
      setTagline(p.tagline ?? '');
      setBio(p.bio ?? '');
      setCategory(p.category ?? '');
      setContactEmail(p.contact_email ?? '');
      setContactPhone(p.contact_phone ?? '');
      setWebsiteUrl(p.website_url ?? '');
      setLogoUrl(p.logo_url ?? '');
      setCoverImageUrl(p.cover_image_url ?? '');
      setVerified(p.verified ?? false);
      setOwnerId(p.owner_id ?? null);

      // Resolve venue name
      if (p.venue_id) {
        setVenueId(p.venue_id);
        const match = venueList.find(v => v.id === p.venue_id);
        setLinkedVenueName(match?.name ?? p.venue_id);
      }

      // Resolve vendor name
      if (p.vendor_id) {
        setVendorId(p.vendor_id);
        const match = vendorList.find(v => v.id === p.vendor_id);
        setLinkedVendorName(match?.name ?? p.vendor_id);
      }

      // Resolve owner email
      if (p.owner_id) {
        const match = userList.find(u => u.id === p.owner_id);
        setLinkedOwnerEmail(match?.email ?? null);
      }

      // Merge visible_modules with defaults
      const rawModules = (p.visible_modules as Partial<Modules>) ?? {};
      setModules({ ...DEFAULT_MODULES, ...rawModules });
    } catch (err) {
      console.error('Edit partner load error:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id]);

  // ── Link helpers ───────────────────────────────────────────────────────────

  function linkVenue(venue: Venue) {
    setVenueId(venue.id);
    setLinkedVenueName(venue.name);
    setVenueSearch('');
  }

  function clearVenue() {
    setVenueId(null);
    setLinkedVenueName(null);
    setVenueSearch('');
  }

  function linkVendor(vendor: Vendor) {
    setVendorId(vendor.id);
    setLinkedVendorName(vendor.name);
    setVendorSearch('');
  }

  function clearVendor() {
    setVendorId(null);
    setLinkedVendorName(null);
    setVendorSearch('');
  }

  function linkUser(user: UserProfile) {
    setOwnerId(user.id);
    setLinkedOwnerEmail(user.email ?? null);
    setUserSearch('');
  }

  function clearUser() {
    setOwnerId(null);
    setLinkedOwnerEmail(null);
    setUserSearch('');
  }

  function toggleModule(key: keyof Modules) {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    try {
      const res = await fetch(`/api/v1/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_type: partnerType,
          venue_id: venueId,
          vendor_id: vendorId,
          owner_id: ownerId,
          display_name: displayName,
          tagline: tagline || null,
          bio: bio || null,
          category: category || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          website_url: websiteUrl || null,
          logo_url: logoUrl || null,
          cover_image_url: coverImageUrl || null,
          verified,
          visible_modules: modules,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: 'Changes saved!' });
        await loadAll();
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to save changes' });
      }
    } catch {
      setToast({ type: 'error', message: 'Unexpected error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Danger zone ────────────────────────────────────────────────────────────

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await fetch(`/api/v1/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      router.push('/admin/partners');
    } catch (err) {
      console.error('Deactivate error:', err);
      setDeactivating(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirming) {
      setDeleteConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await fetch(`/api/v1/partners/${id}`, { method: 'DELETE' });
      router.push('/admin/partners');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleting(false);
      setDeleteConfirming(false);
    }
  }

  const showVenueSearch =
    partnerType === 'venue' || partnerType === 'promoter' || partnerType === 'organizer';
  const showVendorSearch = partnerType === 'vendor';

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[600px] bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-80 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
            <div className="h-40 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Partner not found.</p>
        <a href="/admin/partners" className="text-sm text-[#7DD8E8] hover:text-white transition-colors">
          ← Back to Partners
        </a>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href="/admin/partners"
          className="text-[#7DD8E8] hover:text-white transition-colors text-sm"
        >
          ← Partners
        </a>
        <h1 className="text-2xl font-header font-bold text-white">Edit Partner</h1>
        <a
          href={`/partners/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-[#7DD8E8] hover:text-white transition-colors"
        >
          View Profile →
        </a>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={[
            'p-4 rounded-xl border text-sm font-medium',
            toast.type === 'success'
              ? 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0]'
              : 'bg-red-500/10 border-red-500/30 text-red-400',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LEFT: Partner Details ──────────────────────────────────── */}
          <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-header font-bold text-white">Partner Details</h2>

            {/* Partner Type */}
            <div className="space-y-2">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Partner Type *
              </label>
              <div className="flex flex-wrap gap-2">
                {PARTNER_TYPES.map(type => (
                  <Pill
                    key={type}
                    label={type}
                    selected={partnerType === type}
                    onClick={() => {
                      setPartnerType(type);
                      clearVenue();
                      clearVendor();
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Link to existing record */}
            {partnerType && (
              <>
                {showVenueSearch && (
                  <SearchDropdown<Venue>
                    label="Link Existing Venue"
                    placeholder="Search venues…"
                    items={venues}
                    searchValue={venueSearch}
                    onSearchChange={setVenueSearch}
                    getKey={v => v.id}
                    getPrimary={v => v.name}
                    getSecondary={v => v.address}
                    onSelect={linkVenue}
                    linked={linkedVenueName}
                    onClear={clearVenue}
                  />
                )}
                {showVendorSearch && (
                  <SearchDropdown<Vendor>
                    label="Link Existing Vendor"
                    placeholder="Search vendors…"
                    items={vendors}
                    searchValue={vendorSearch}
                    onSearchChange={setVendorSearch}
                    getKey={v => v.id}
                    getPrimary={v => v.name}
                    getSecondary={v => v.type ?? v.location ?? ''}
                    onSelect={linkVendor}
                    linked={linkedVendorName}
                    onClear={clearVendor}
                  />
                )}
              </>
            )}

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Short catchy description"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Live Music, Restaurant, DJ"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Cover Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Verified toggle */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
              <span className="text-sm text-white">Mark as Verified</span>
              <Toggle value={verified} onChange={() => setVerified(v => !v)} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !partnerType || !displayName}
              className="w-full py-3 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-header font-bold text-red-400">Danger Zone</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deactivating}
                  onClick={handleDeactivate}
                  className="flex-1 py-2 px-3 text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {deactivating ? 'Deactivating…' : 'Deactivate Partner'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className={`flex-1 py-2 px-3 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50 ${
                    deleteConfirming
                      ? 'bg-red-600/30 border-red-500/50 text-red-300 hover:bg-red-600/40'
                      : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {deleting
                    ? 'Deleting…'
                    : deleteConfirming
                    ? 'Are you sure? Click to confirm'
                    : 'Delete Partner'}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Modules + Owner ─────────────────────────────────── */}
          <div className="space-y-4">
            {/* Visible Modules */}
            <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-header font-bold text-white">Profile Sections</h2>
                <p className="text-sm text-[#7DD8E8] mt-1">
                  Choose which sections appear on the public profile
                </p>
              </div>
              <div className="space-y-2">
                {MODULE_ROWS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
                  >
                    <span className="text-sm text-white">{label}</span>
                    <Toggle value={modules[key]} onChange={() => toggleModule(key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Owner Assignment */}
            <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-header font-bold text-white">Assign Owner</h2>
                <p className="text-sm text-[#7DD8E8] mt-1">
                  Link this profile to an existing user account
                </p>
              </div>
              <SearchDropdown<UserProfile>
                label="Owner"
                placeholder="Search by email…"
                items={users}
                searchValue={userSearch}
                onSearchChange={setUserSearch}
                getKey={u => u.id}
                getPrimary={u => u.email ?? ''}
                getSecondary={u =>
                  [u.first_name, u.last_name].filter(Boolean).join(' ') || 'No name'
                }
                onSelect={linkUser}
                linked={linkedOwnerEmail}
                onClear={clearUser}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
