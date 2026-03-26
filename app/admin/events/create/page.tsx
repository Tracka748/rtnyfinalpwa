'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Constants ───────────────────────────────────────────────────────────────

const NEIGHBORHOODS = [
  'park_ave', 'east_end', 'monroe_ave', 'southwest', 'urban', 'suburban',
] as const;

const VIBE_TAGS = [
  'hip_hop', 'reggae_dancehall', 'spanish_vibes', 'lgbtq',
  'music_junkie', 'r_and_b', 'latin', 'afrobeats',
] as const;

const AGE_RANGES = ['18-20', '21-25', '26-30', '31-35', '36-45', '46+'] as const;

const CATEGORIES = ['nightlife', 'family', 'movies', 'dining', 'arts', 'sports'] as const;

const STATUSES: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'postponed', label: 'Postponed' },
];

const MARKETING_PACKAGES = [
  { value: 'none', label: 'None', sublabel: '' },
  { value: 'basic', label: 'Basic', sublabel: '$10 flat listing' },
  { value: 'local_star', label: 'Local Star', sublabel: '2-post package' },
  { value: 'night_owl', label: 'Night Owl', sublabel: 'Full platform' },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

interface Venue {
  id: string;
  name: string;
  address: string;
}

interface Promoter {
  id: string;
  business_name: string;
}

// ── Pill component ──────────────────────────────────────────────────────────

function Pill({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: 'mint' | 'cyan';
  onClick: () => void;
}) {
  const activeClass =
    color === 'mint'
      ? 'bg-[#59FFA0]/20 border-[#59FFA0] text-[#59FFA0]'
      : 'bg-[#1AC8ED]/20 border-[#1AC8ED] text-[#1AC8ED]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        selected ? activeClass : 'border-white/20 text-[#7DD8E8] hover:border-white/40',
      ].join(' ')}
    >
      {label.replace(/_/g, ' ')}
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function AdminCreateEventPage() {
  const router = useRouter();

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [category, setCategory] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [flyerImageUrl, setFlyerImageUrl] = useState('');
  const [status, setStatus] = useState('active');

  // Audience
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [marketingPackage, setMarketingPackage] = useState('none');

  // Reach
  const [estimatedReach, setEstimatedReach] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Venues & promoters
  const [venues, setVenues] = useState<Venue[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [promoterId, setPromoterId] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Load venues + total user count ────────────────────────────────────────

  useEffect(() => {
    fetch('/api/v1/venues')
      .then((r) => r.json())
      .then((d) => { if (d.success) setVenues(d.data); })
      .catch(console.error);

    fetch('/api/v1/admin/promoters', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setPromoters(d.data); })
      .catch(console.error);

    // Fetch total user count (no filters)
    fetch('/api/v1/admin/audience-reach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighborhoods: [], vibe_tags: [], age_ranges: [] }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTotalUsers(d.data.estimated_reach); })
      .catch(console.error);
  }, []);

  // ── Debounced reach fetch ─────────────────────────────────────────────────

  const fetchReach = useCallback(() => {
    setReachLoading(true);
    fetch('/api/v1/admin/audience-reach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        neighborhoods: selectedNeighborhoods,
        vibe_tags: selectedVibes,
        age_ranges: selectedAgeRanges,
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setEstimatedReach(d.data.estimated_reach); })
      .catch(console.error)
      .finally(() => setReachLoading(false));
  }, [selectedNeighborhoods, selectedVibes, selectedAgeRanges]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchReach, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchReach]);

  // ── Toggle helpers ────────────────────────────────────────────────────────

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    try {
      // Combine date + time into a single ISO datetime string
      const combinedEventDate = startTime
        ? `${eventDate}T${startTime}:00`
        : `${eventDate}T00:00:00`;

      const res = await fetch('/api/v1/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          event_date: combinedEventDate,
          venue_id: venueId,
          category,
          total_tickets: totalTickets ? Number(totalTickets) : null,
          ticket_price: ticketPrice ? Number(ticketPrice) : null,
          flyer_image_url: flyerImageUrl,
          status,
          promoter_id: promoterId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: 'Event created successfully!' });
        setTimeout(() => router.push('/admin/events'), 1500);
      } else {
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error ?? 'Failed to create event');
        setToast({ type: 'error', message: msg });
      }
    } catch {
      setToast({ type: 'error', message: 'Unexpected error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reach display ─────────────────────────────────────────────────────────

  const hasFilters =
    selectedNeighborhoods.length > 0 ||
    selectedVibes.length > 0 ||
    selectedAgeRanges.length > 0;

  const reachDisplay = reachLoading
    ? null
    : hasFilters
    ? estimatedReach
    : totalUsers;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/admin/events"
          className="text-[#7DD8E8] hover:text-white transition-colors text-sm"
        >
          ← Events
        </a>
        <h1 className="text-2xl font-header font-bold text-white">Create Event</h1>
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
          {/* ── LEFT COLUMN: Event Details ──────────────────────────────── */}
          <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-header font-bold text-white">Event Details</h2>

            {/* Event Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friday Night Social"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's happening at this event?"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors resize-none"
              />
            </div>

            {/* Date & Time row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  aria-label="Event Date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Start Time
                </label>
                <input
                  type="time"
                  aria-label="Start Time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Venue */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Venue
              </label>
              <select
                aria-label="Venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              >
                <option value="">None</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Promoter */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Promoter
              </label>
              <select
                aria-label="Promoter"
                value={promoterId}
                onChange={(e) => setPromoterId(e.target.value)}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              >
                <option value="">None</option>
                {promoters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.business_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Category
              </label>
              <select
                required
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tickets & Price row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Total Tickets
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                />
              </div>
            </div>

            {/* Flyer Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Flyer Image URL
              </label>
              <input
                type="url"
                value={flyerImageUrl}
                onChange={(e) => setFlyerImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Status
              </label>
              <select
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0E0E10] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Creating…' : 'Create Event'}
            </button>
          </div>

          {/* ── RIGHT COLUMN: Target Audience ───────────────────────────── */}
          <div className="space-y-4">
            {/* Target Audience card */}
            <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-header font-bold text-white">Target Audience</h2>
                <p className="text-sm text-[#7DD8E8] mt-1">Select who should see this event</p>
              </div>

              {/* Neighborhoods */}
              <div className="space-y-2">
                <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Neighborhoods
                </p>
                <div className="flex flex-wrap gap-2">
                  {NEIGHBORHOODS.map((n) => (
                    <Pill
                      key={n}
                      label={n}
                      selected={selectedNeighborhoods.includes(n)}
                      color="mint"
                      onClick={() => toggle(selectedNeighborhoods, n, setSelectedNeighborhoods)}
                    />
                  ))}
                </div>
              </div>

              {/* Vibe Tags */}
              <div className="space-y-2">
                <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Vibe Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {VIBE_TAGS.map((tag) => (
                    <Pill
                      key={tag}
                      label={tag}
                      selected={selectedVibes.includes(tag)}
                      color="cyan"
                      onClick={() => toggle(selectedVibes, tag, setSelectedVibes)}
                    />
                  ))}
                </div>
              </div>

              {/* Age Ranges */}
              <div className="space-y-2">
                <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                  Age Ranges
                </p>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map((age) => (
                    <Pill
                      key={age}
                      label={age}
                      selected={selectedAgeRanges.includes(age)}
                      color="mint"
                      onClick={() => toggle(selectedAgeRanges, age, setSelectedAgeRanges)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Estimated Reach card */}
            <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6">
              <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium mb-3">
                Estimated Reach
              </p>
              {reachLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#59FFA0]/30 border-t-[#59FFA0] rounded-full animate-spin" />
                  <span className="text-sm text-[#7DD8E8]">Calculating…</span>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-header font-bold text-[#59FFA0]">
                    ~{(reachDisplay ?? 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#7DD8E8] mt-1">
                    {hasFilters
                      ? 'users match this audience'
                      : `All users (~${(totalUsers ?? 0).toLocaleString()})`}
                  </p>
                </div>
              )}
            </div>

            {/* Marketing Package card */}
            <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-3">
              <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Marketing Package
              </p>
              <div className="space-y-2">
                {MARKETING_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.value}
                    type="button"
                    onClick={() => setMarketingPackage(pkg.value)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all',
                      marketingPackage === pkg.value
                        ? 'border-[#59FFA0] bg-[#59FFA0]/10'
                        : 'border-white/10 hover:border-white/30',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'text-sm font-medium',
                        marketingPackage === pkg.value ? 'text-[#59FFA0]' : 'text-white',
                      ].join(' ')}
                    >
                      {pkg.label}
                    </span>
                    {pkg.sublabel && (
                      <span className="text-xs text-[#7DD8E8]">{pkg.sublabel}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
