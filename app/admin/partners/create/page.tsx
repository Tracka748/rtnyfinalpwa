'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

// ── Dropdown search ──────────────────────────────────────────────────────────

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
  skipToggleLabel,
  skipToggleValue,
  onSkipToggle,
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
  skipToggleLabel?: string;
  skipToggleValue?: boolean;
  onSkipToggle?: () => void;
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
                onMouseDown={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-sm text-white">{getPrimary(item)}</span>
                <span className="text-xs text-[#7DD8E8]">{getSecondary(item)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {skipToggleLabel && onSkipToggle && (
        <button
          type="button"
          onClick={onSkipToggle}
          className="text-xs text-[#1AC8ED] hover:text-[#1AC8ED]/80 transition-colors"
        >
          {skipToggleValue ? '← Link to existing record instead' : `Skip linking — create blank profile instead`}
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCreatePartnerPage() {
  const router = useRouter();

  // Partner type
  const [partnerType, setPartnerType] = useState('');
  const [skipLinking, setSkipLinking] = useState(false);

  // Venue link
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueSearch, setVenueSearch] = useState('');
  const [linkedVenue, setLinkedVenue] = useState<Venue | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  // Vendor link
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [linkedVendor, setLinkedVendor] = useState<Vendor | null>(null);
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
  const [modules, setModules] = useState<Modules>({
    about: true,
    upcoming_events: true,
    gallery: false,
    rewards_offers: false,
    plan_your_event: false,
    activity_feed: false,
    experiences: false,
  });

  // Owner
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [linkedUser, setLinkedUser] = useState<UserProfile | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/v1/venues')
      .then(r => r.json())
      .then(d => { if (d.success) setVenues(d.data); })
      .catch(console.error);

    const supabase = createBrowserSupabaseClient();

    supabase
      .from('vendors')
      .select('id, name, location, type')
      .then(({ data }) => { if (data) setVendors(data); })
      .catch(console.error);

    supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .limit(200)
      .then(({ data }) => { if (data) setUsers(data); })
      .catch(console.error);
  }, []);

  // ── Link helpers ───────────────────────────────────────────────────────────

  function linkVenue(venue: Venue) {
    setLinkedVenue(venue);
    setVenueId(venue.id);
    setVenueSearch('');
    if (!displayName) setDisplayName(venue.name);
  }

  function clearVenue() {
    setLinkedVenue(null);
    setVenueId(null);
    setVenueSearch('');
  }

  function linkVendor(vendor: Vendor) {
    setLinkedVendor(vendor);
    setVendorId(vendor.id);
    setVendorSearch('');
    if (!displayName) setDisplayName(vendor.name);
  }

  function clearVendor() {
    setLinkedVendor(null);
    setVendorId(null);
    setVendorSearch('');
  }

  function linkUser(user: UserProfile) {
    setLinkedUser(user);
    setOwnerId(user.id);
    setUserSearch('');
  }

  function clearUser() {
    setLinkedUser(null);
    setOwnerId(null);
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
      const res = await fetch('/api/v1/partners', {
        method: 'POST',
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
        setToast({ type: 'success', message: 'Partner created!' });
        setTimeout(() => router.push('/admin/partners'), 1500);
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to create partner' });
      }
    } catch {
      setToast({ type: 'error', message: 'Unexpected error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const showVenueSearch = !skipLinking && (
    partnerType === 'venue' || partnerType === 'promoter' || partnerType === 'organizer'
  );
  const showVendorSearch = !skipLinking && partnerType === 'vendor';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin/partners"
          className="text-[#7DD8E8] hover:text-white transition-colors text-sm"
        >
          ← Partners
        </a>
        <h1 className="text-2xl font-header font-bold text-white">Create Partner</h1>
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
                      setSkipLinking(false);
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
                    label={`Link Existing Venue`}
                    placeholder="Search venues…"
                    items={venues}
                    searchValue={venueSearch}
                    onSearchChange={setVenueSearch}
                    getKey={v => v.id}
                    getPrimary={v => v.name}
                    getSecondary={v => v.address}
                    onSelect={linkVenue}
                    linked={linkedVenue?.name ?? null}
                    onClear={clearVenue}
                    skipToggleLabel="Skip linking — create blank profile instead"
                    skipToggleValue={skipLinking}
                    onSkipToggle={() => { setSkipLinking(v => !v); clearVenue(); }}
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
                    linked={linkedVendor?.name ?? null}
                    onClear={clearVendor}
                    skipToggleLabel="Skip linking — create blank profile instead"
                    skipToggleValue={skipLinking}
                    onSkipToggle={() => { setSkipLinking(v => !v); clearVendor(); }}
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
                placeholder="e.g. The Venue at Rochester"
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
                placeholder="Tell people about this partner…"
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
                placeholder="hello@partner.com"
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
                placeholder="+1 (585) 000-0000"
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
              {submitting ? 'Creating…' : 'Create Partner'}
            </button>
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
                label="Owner (optional)"
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
                linked={linkedUser?.email ?? null}
                onClear={clearUser}
              />
              {!linkedUser && (
                <p className="text-xs text-[#7A7978]">
                  If left unset, defaults to the current admin user.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
