'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Venue {
  id: string;
  name: string;
  address?: string;
}

interface VenueOption {
  id: string;
  name: string;
}

interface EventForm {
  name: string;
  category: string;
  event_date: string;  // YYYY-MM-DD
  event_time: string;  // HH:MM
  venue_id: string;
  status: string;
  total_tickets: string;
  flyer_image_url: string;
  featured: boolean;
}

interface InviteRun {
  id: string;
  sent_count: number;
  target_neighborhoods: string[];
  target_vibes: string[];
  target_age_ranges: string[];
  created_at: string;
}

interface EventDetail {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  category: string;
  status: string;
  total_tickets?: number;
  tickets_sold?: number;
  ticket_types?: { price: number }[];
  flyer_image_url?: string;
  venue?: Venue | null;
  custom_address?: string | null;
  invite_runs: InviteRun[];
}

interface TicketType {
  id: string;
  event_id: string | null;
  name: string;
  price: number;
  quantity: number;
  remaining: number;
  description: string | null;
  created_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NEIGHBORHOODS = ['park_ave', 'east_end', 'monroe_ave', 'southwest', 'urban', 'suburban'];
const VIBES = ['hip_hop', 'reggae_dancehall', 'spanish_vibes', 'lgbtq', 'music_junkie', 'r_and_b', 'latin', 'afrobeats'];
const AGE_RANGES = ['18-20', '21-25', '26-30', '31-35', '36-45', '46+'];

type Preset = 'free' | 'general' | 'vip' | 'early_bird';

interface NewTicketForm {
  preset: Preset | null;
  name: string;
  price: string;
  quantity: string;
  description: string;
  available_from: string;
  available_until: string;
}

const EMPTY_FORM: NewTicketForm = {
  preset: null,
  name: '',
  price: '',
  quantity: '',
  description: '',
  available_from: '',
  available_until: '',
};

const CATEGORIES = ['nightlife', 'family', 'movies', 'dining', 'arts', 'sports'];
const STATUSES = ['active', 'cancelled', 'sold_out', 'postponed'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#59FFA0]/10 text-[#59FFA0] border-[#59FFA0]/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  sold_out: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  postponed: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function getLowestPrice(ticketTypes: { price: number }[] | null | undefined): number | undefined {
  if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) return undefined;
  const prices = ticketTypes
    .map((t) => (typeof t?.price === 'number' ? t.price : null))
    .filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : undefined;
}

function formatRunDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function pillLabel(v: string) {
  return v.replace(/_/g, ' ');
}

function eventToForm(e: EventDetail): EventForm {
  const dt = e.event_date ?? '';
  return {
    name: e.name ?? '',
    category: e.category ?? '',
    event_date: dt.split('T')[0] ?? '',
    event_time: dt.includes('T') ? (dt.split('T')[1]?.slice(0, 5) ?? '') : '',
    venue_id: e.venue?.id ?? '',
    status: e.status ?? 'active',
    total_tickets: String(e.total_tickets ?? ''),
    flyer_image_url: e.flyer_image_url ?? '',
    featured: false, // not stored on EventDetail — defaulting; update if added to type
  };
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1a1c] border border-[#2a2a2a] rounded-xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-header font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function SelectablePill({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: 'cyan' | 'mint';
  onClick: () => void;
}) {
  const active =
    color === 'cyan'
      ? 'bg-[#1AC8ED]/15 border-[#1AC8ED] text-[#1AC8ED]'
      : 'bg-[#59FFA0]/15 border-[#59FFA0] text-[#59FFA0]';
  const inactive =
    'bg-white/[0.03] border-white/10 text-white/40 hover:border-white/25 hover:text-white/60';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected ? active : inactive
      }`}
    >
      {pillLabel(label)}
    </button>
  );
}

// ── Ticket Row (inline editable) ──────────────────────────────────────────────

function TicketRow({
  ticket,
  eventId,
  onUpdated,
  onDeleted,
}: {
  ticket: TicketType;
  eventId: string;
  onUpdated: (updated: TicketType) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(ticket.name);
  const [price, setPrice] = useState(String(ticket.price));
  const [quantity, setQuantity] = useState(String(ticket.quantity));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isFree = Number(price) === 0;

  async function saveField(field: Partial<{ name: string; price: number; quantity: number }>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/events/${eventId}/admissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_type_id: ticket.id, ...field }),
      });
      const data = await res.json();
      if (data.success) onUpdated(data.data.ticket_type);
    } catch {
      // silently fail — local state already reflects intent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${ticket.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/events/${eventId}/admissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_type_id: ticket.id }),
      });
      const data = await res.json();
      if (data.success) onDeleted(ticket.id);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2a2a2a]/60 last:border-0">
      {/* Checkbox — visual only */}
      <div className="flex-shrink-0">
        <div className="w-4 h-4 rounded border border-[#59FFA0]/40 bg-[#59FFA0]/10 flex items-center justify-center cursor-default">
          <div className="w-2 h-2 rounded-sm bg-[#59FFA0]" />
        </div>
      </div>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== ticket.name && saveField({ name })}
        className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none border-b border-transparent focus:border-white/20 transition-colors py-0.5"
      />

      {/* Price */}
      <div className="flex-shrink-0 w-24">
        {isFree ? (
          <span className="text-xs text-white/30 pl-1">Free</span>
        ) : (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => price !== String(ticket.price) && saveField({ price: Number(price) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-5 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="flex-shrink-0 w-20">
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={() =>
            quantity !== String(ticket.quantity) && saveField({ quantity: Number(quantity) })
          }
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-white/30 transition-colors"
          title="Quantity"
        />
      </div>

      {saving && <span className="text-xs text-white/30 flex-shrink-0">…</span>}

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        title="Delete ticket type"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // ── Event data ──────────────────────────────────────────────────────────────
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Event details form ───────────────────────────────────────────────────────
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [eventFormDirty, setEventFormDirty] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventSaveStatus, setEventSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [eventSaveError, setEventSaveError] = useState<string | null>(null);

  // ── Venues list ─────────────────────────────────────────────────────────────
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesError, setVenuesError] = useState(false);

  // ── Custom address toggle ────────────────────────────────────────────────────
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState('');

  // ── Admissions ──────────────────────────────────────────────────────────────
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketForm>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Promote This Event ───────────────────────────────────────────────────────
  const [selNeighborhoods, setSelNeighborhoods] = useState<string[]>([]);
  const [selVibes, setSelVibes] = useState<string[]>([]);
  const [selAges, setSelAges] = useState<string[]>([]);
  const [reach, setReach] = useState<number | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const reachDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent_count: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── Fetch event ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/v1/admin/events/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEvent(d.data);
        else setError(d.error ?? 'Failed to load event');
      })
      .catch(() => setError('Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Init form when event loads ───────────────────────────────────────────────

  useEffect(() => {
    if (event && !eventForm) {
      setEventForm(eventToForm(event));
      if (event.custom_address) {
        setUseCustomAddress(true);
        setCustomAddress(event.custom_address);
      }
    }
  }, [event, eventForm]);

  // ── Fetch venues ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/v1/admin/venues')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setVenues(d.data.venues as VenueOption[]);
        } else {
          console.error('Venues fetch failed:', d.error);
          setVenuesError(true);
        }
      })
      .catch((err) => {
        console.error('Venues fetch error:', err);
        setVenuesError(true);
      });
  }, []);

  // ── Fetch ticket types ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setAdmissionsLoading(true);
    fetch(`/api/v1/admin/events/${id}/admissions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTicketTypes(d.data.ticket_types ?? []);
      })
      .catch(console.error)
      .finally(() => setAdmissionsLoading(false));
  }, [id]);

  // ── Debounced reach estimate ──────────────────────────────────────────────────

  const fetchReach = useCallback(
    (neighborhoods: string[], vibes: string[], ages: string[]) => {
      setReachLoading(true);
      fetch('/api/v1/admin/audience-reach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neighborhoods, vibe_tags: vibes, age_ranges: ages }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.success) setReach(d.data.estimated_reach); })
        .catch(console.error)
        .finally(() => setReachLoading(false));
    },
    []
  );

  useEffect(() => {
    if (reachDebounce.current) clearTimeout(reachDebounce.current);
    reachDebounce.current = setTimeout(() => {
      fetchReach(selNeighborhoods, selVibes, selAges);
    }, 800);
    return () => {
      if (reachDebounce.current) clearTimeout(reachDebounce.current);
    };
  }, [selNeighborhoods, selVibes, selAges, fetchReach]);

  // ── Save event details ───────────────────────────────────────────────────────

  async function handleSaveDetails() {
    if (!eventForm) return;
    setEventSaving(true);
    setEventSaveStatus('idle');
    setEventSaveError(null);
    try {
      // Combine date + time back into ISO string
      const combinedDate = eventForm.event_time
        ? `${eventForm.event_date}T${eventForm.event_time}:00`
        : eventForm.event_date;

      const res = await fetch(`/api/v1/admin/events/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventForm.name,
          category: eventForm.category,
          event_date: combinedDate,
          venue_id: useCustomAddress ? null : (eventForm.venue_id || undefined),
          custom_address: useCustomAddress ? customAddress : null,
          status: eventForm.status,
          total_tickets: eventForm.total_tickets ? Number(eventForm.total_tickets) : undefined,
          flyer_image_url: eventForm.flyer_image_url || null,
          featured: eventForm.featured,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent((prev) => prev ? { ...prev, ...data.data.event } : prev);
        setEventFormDirty(false);
        setEventSaveStatus('saved');
        setTimeout(() => setEventSaveStatus('idle'), 2000);
      } else {
        setEventSaveStatus('error');
        setEventSaveError(data.error ?? 'Failed to save');
      }
    } catch {
      setEventSaveStatus('error');
      setEventSaveError('Unexpected error. Please try again.');
    } finally {
      setEventSaving(false);
    }
  }

  function setField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setEventForm((f) => f ? { ...f, [key]: value } : f);
    setEventFormDirty(true);
  }

  // ── Add ticket type ───────────────────────────────────────────────────────────

  function applyPreset(preset: Preset) {
    const defaults: Record<Preset, Partial<NewTicketForm>> = {
      free: { name: 'Free Admission', price: '0' },
      general: { name: 'General Admission', price: '' },
      vip: { name: 'VIP', price: '' },
      early_bird: { name: 'Early Bird', price: '' },
    };
    setNewTicket({ ...EMPTY_FORM, preset, ...defaults[preset] });
  }

  async function handleAddTicket() {
    if (!newTicket.name.trim()) { setAddError('Name is required'); return; }
    if (newTicket.price === '') { setAddError('Price is required'); return; }
    if (!newTicket.quantity) { setAddError('Quantity is required'); return; }
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/v1/admin/events/${id}/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTicket.name.trim(),
          price: Number(newTicket.price),
          quantity: Number(newTicket.quantity),
          description: newTicket.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketTypes((prev) => [...prev, data.data.ticket_type]);
        setNewTicket(EMPTY_FORM);
        setShowAddForm(false);
      } else {
        setAddError(data.error ?? 'Failed to add ticket type');
      }
    } catch {
      setAddError('Unexpected error. Please try again.');
    } finally {
      setAddSaving(false);
    }
  }

  // ── Send invites ──────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!event) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    setConfirming(false);
    try {
      const res = await fetch('/api/v1/admin/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          target_neighborhoods: selNeighborhoods,
          target_vibes: selVibes,
          target_age_ranges: selAges,
          subject: customSubject.trim() || undefined,
          preview_text: previewText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult(data.data);
        // Refresh invite runs
        fetch(`/api/v1/admin/events/${id}`)
          .then((r) => r.json())
          .then((d) => { if (d.success) setEvent(d.data); })
          .catch(console.error);
      } else {
        setSendError(data.error ?? 'Failed to send invites');
      }
    } catch {
      setSendError('Unexpected error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 bg-white/5 rounded-lg w-48" />
        <div className="h-32 bg-white/5 rounded-xl" />
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">{error ?? 'Event not found'}</p>
        <a
          href="/admin/events"
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
        >
          Back to Events
        </a>
      </div>
    );
  }

  const statusCls = STATUS_COLORS[event.status] ?? 'bg-white/5 text-white border-white/10';
  const venueName = event.venue?.name ?? 'TBA';
  const ticketPrice = getLowestPrice(event.ticket_types);
  const isEarlyBird = newTicket.preset === 'early_bird';
  const reachDisplay = reach != null ? `~${reach.toLocaleString()}` : '…';

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Breadcrumb + title */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-2">
          <a href="/admin/events" className="text-[#7DD8E8] hover:text-white transition-colors">
            Events
          </a>
          <span className="text-white/30">/</span>
          <span className="text-white/60 truncate">{event.name}</span>
        </div>
        <h1 className="text-2xl font-header font-bold text-white">{event.name}</h1>
      </div>

      {/* ── Event Details ────────────────────────────────────────────────────── */}
      <SectionCard
        title="Event Details"
        action={
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleSaveDetails}
              disabled={!eventFormDirty || eventSaving}
              className="px-4 py-1.5 bg-[#59FFA0] text-[#121113] font-semibold text-xs rounded-lg hover:bg-[#4de891] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {eventSaving
                ? 'Saving…'
                : eventSaveStatus === 'saved'
                ? '✓ Saved'
                : 'Save Changes'}
            </button>
            {eventSaveStatus === 'error' && eventSaveError && (
              <p className="text-xs text-red-400 text-right">{eventSaveError}</p>
            )}
          </div>
        }
      >
        {eventForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

            {/* Name — full width */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1">Event Name</label>
              <input
                type="text"
                value={eventForm.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Category</label>
              <select
                value={eventForm.category}
                onChange={(e) => setField('category', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors appearance-none"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#1a1a1c]">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Status</label>
              <select
                value={eventForm.status}
                onChange={(e) => setField('status', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors appearance-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[#1a1a1c]">
                    {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Event Date</label>
              <input
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setField('event_date', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Start Time</label>
              <input
                type="time"
                value={eventForm.event_time}
                onChange={(e) => setField('event_time', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Venue</label>
              {!useCustomAddress ? (
                <>
                  {venuesError ? (
                    <select
                      disabled
                      className="w-full bg-white/5 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400/70 focus:outline-none appearance-none opacity-70"
                    >
                      <option>Error loading venues</option>
                    </select>
                  ) : (
                    <select
                      value={eventForm.venue_id}
                      onChange={(e) => setField('venue_id', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors appearance-none"
                    >
                      <option value="">No venue / TBA</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id} className="bg-[#1a1a1c]">
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => { setUseCustomAddress(true); setEventFormDirty(true); }}
                    className="text-xs text-[#1AC8ED] hover:text-[#1AC8ED]/80 transition-colors mt-1"
                  >
                    + Use custom address instead
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => { setCustomAddress(e.target.value); setEventFormDirty(true); }}
                    placeholder="Enter full address e.g. 123 Main St, Rochester, NY"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setUseCustomAddress(false); setEventFormDirty(true); }}
                    className="text-xs text-[#1AC8ED] hover:text-[#1AC8ED]/80 transition-colors mt-1"
                  >
                    ← Select from venue list instead
                  </button>
                </>
              )}
            </div>

            {/* Total Tickets */}
            <div>
              <label className="block text-xs text-white/40 mb-1">Total Tickets</label>
              <input
                type="number"
                min="0"
                value={eventForm.total_tickets}
                onChange={(e) => setField('total_tickets', e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Flyer Image URL — full width */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1">Flyer Image URL</label>
              <input
                type="text"
                value={eventForm.flyer_image_url}
                onChange={(e) => setField('flyer_image_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            {/* Featured toggle */}
            <div className="sm:col-span-2 flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-white/70">Featured</p>
                <p className="text-xs text-white/30">Pin this event to featured listings</p>
              </div>
              <button
                type="button"
                onClick={() => setField('featured', !eventForm.featured)}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  eventForm.featured ? 'bg-[#59FFA0]' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    eventForm.featured ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sold / total (read-only info) */}
            {(event.total_tickets ?? 0) > 0 && (
              <div className="sm:col-span-2 text-xs text-white/30">
                {event.tickets_sold ?? 0} sold out of {event.total_tickets}
              </div>
            )}

          </div>
        )}
      </SectionCard>

      {/* ── Admissions ───────────────────────────────────────────────────────── */}
      <SectionCard title="Admissions" subtitle="Manage ticket types for this event">

        {admissionsLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {ticketTypes.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-4 flex-shrink-0" />
                  <span className="flex-1 text-xs text-white/30">Name</span>
                  <span className="w-24 flex-shrink-0 text-xs text-white/30">Price</span>
                  <span className="w-20 flex-shrink-0 text-center text-xs text-white/30">Qty</span>
                  <div className="w-6 flex-shrink-0" />
                </div>
                <div>
                  {ticketTypes.map((tt) => (
                    <TicketRow
                      key={tt.id}
                      ticket={tt}
                      eventId={id}
                      onUpdated={(updated) =>
                        setTicketTypes((prev) =>
                          prev.map((t) => (t.id === updated.id ? updated : t))
                        )
                      }
                      onDeleted={(deletedId) =>
                        setTicketTypes((prev) => prev.filter((t) => t.id !== deletedId))
                      }
                    />
                  ))}
                </div>
              </>
            )}

            {ticketTypes.length === 0 && !showAddForm && (
              <p className="text-sm text-white/30 italic py-2">
                No ticket types yet. Add one below.
              </p>
            )}

            {showAddForm && (
              <div className="mt-3 pt-4 border-t border-[#2a2a2a]">
                {/* Preset buttons */}
                <p className="text-xs text-white/40 mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {([
                    ['free', 'Free Admission'],
                    ['general', 'General Admission'],
                    ['vip', 'VIP'],
                    ['early_bird', 'Early Bird'],
                  ] as [Preset, string][]).map(([p, label]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        newTicket.preset === p
                          ? 'bg-[#59FFA0]/15 border-[#59FFA0] text-[#59FFA0]'
                          : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-white/40 mb-1">Name</label>
                      <input
                        type="text"
                        value={newTicket.name}
                        onChange={(e) => setNewTicket((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Ticket name"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newTicket.price}
                          onChange={(e) => setNewTicket((f) => ({ ...f, price: e.target.value }))}
                          placeholder="0.00"
                          disabled={newTicket.preset === 'free'}
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={newTicket.quantity}
                        onChange={(e) => setNewTicket((f) => ({ ...f, quantity: e.target.value }))}
                        placeholder="100"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                      />
                    </div>
                  </div>

                  {isEarlyBird && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Available From</label>
                        <input
                          type="datetime-local"
                          value={newTicket.available_from}
                          onChange={(e) => setNewTicket((f) => ({ ...f, available_from: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Available Until</label>
                        <input
                          type="datetime-local"
                          value={newTicket.available_until}
                          onChange={(e) => setNewTicket((f) => ({ ...f, available_until: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-white/25 italic -mt-1">
                        Date range enforcement — <span className="text-white/35">coming soon</span>
                      </p>
                    </div>
                  )}

                  {addError && <p className="text-xs text-red-400">{addError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      disabled={addSaving}
                      className="px-5 py-2 bg-[#59FFA0] text-[#121113] font-semibold text-sm rounded-lg hover:bg-[#4de891] transition-colors disabled:opacity-50"
                    >
                      {addSaving ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewTicket(EMPTY_FORM); setAddError(null); }}
                      className="px-4 py-2 bg-white/5 text-white/50 text-sm rounded-lg hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-4 flex items-center gap-1.5 text-sm text-[#59FFA0] hover:text-white transition-colors"
              >
                <span className="text-base leading-none">+</span> Add Ticket Type
              </button>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Promote This Event ────────────────────────────────────────────────── */}
      <SectionCard title="Promote This Event">
        <div className="space-y-8">

          {/* STEP 1 ─ Who should receive this invite? */}
          <div>
            <p className="text-[10px] font-bold text-[#1AC8ED] tracking-widest uppercase mb-3">
              Step 1
            </p>
            <p className="text-sm font-semibold text-white mb-4">
              Who should receive this invite?
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 mb-2">Neighborhoods</p>
                <div className="flex flex-wrap gap-2">
                  {NEIGHBORHOODS.map((n) => (
                    <SelectablePill
                      key={n}
                      label={n}
                      selected={selNeighborhoods.includes(n)}
                      color="mint"
                      onClick={() => setSelNeighborhoods((p) => toggle(p, n))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2">Vibe Tags</p>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <SelectablePill
                      key={v}
                      label={v}
                      selected={selVibes.includes(v)}
                      color="cyan"
                      onClick={() => setSelVibes((p) => toggle(p, v))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2">Age Ranges</p>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map((a) => (
                    <SelectablePill
                      key={a}
                      label={a}
                      selected={selAges.includes(a)}
                      color="mint"
                      onClick={() => setSelAges((p) => toggle(p, a))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-white/25 mt-4">
              Leave all unselected to reach your entire audience
            </p>
          </div>

          {/* STEP 2 ─ Estimated Reach */}
          <div>
            <p className="text-[10px] font-bold text-[#1AC8ED] tracking-widest uppercase mb-3">
              Step 2
            </p>
            {reachLoading ? (
              <p className="text-4xl font-bold text-white/20 animate-pulse leading-none">…</p>
            ) : reach != null ? (
              <>
                <p className="text-4xl font-bold text-[#59FFA0] leading-none">
                  {reachDisplay}
                </p>
                <p className="text-sm text-white/40 mt-2">users match this audience</p>
              </>
            ) : (
              <p className="text-4xl font-bold text-white/20 leading-none">…</p>
            )}
            <p className="text-xs text-white/20 mt-2">Based on profiles that completed setup</p>
          </div>

          {/* STEP 3 ─ Customize Message */}
          <div>
            <p className="text-[10px] font-bold text-[#1AC8ED] tracking-widest uppercase mb-3">
              Step 3
            </p>
            <button
              type="button"
              onClick={() => setCustomizeOpen((o) => !o)}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <span
                className={`text-[#1AC8ED] text-xs transition-transform duration-200 ${
                  customizeOpen ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
              Customize email{' '}
              <span className="text-white/30">(optional)</span>
            </button>

            {customizeOpen && (
              <div className="mt-3 space-y-3 pl-4 border-l border-[#2a2a2a]">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Subject line</label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder={`You're Invited: ${event.name} at ${venueName}`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Preview text</label>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Join us for an unforgettable night..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#59FFA0]/40 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 4 ─ Send */}
          <div>
            <p className="text-[10px] font-bold text-[#1AC8ED] tracking-widest uppercase mb-3">
              Step 4
            </p>

            {/* Confirm dialog */}
            {confirming && (
              <div className="mb-4 p-4 bg-[#1e1e20] border border-[#2a2a2a] rounded-xl">
                <p className="text-sm font-semibold text-white mb-1">
                  Send invites to{' '}
                  <span className="text-[#59FFA0]">{reachDisplay} users</span>{' '}
                  for <span className="text-white">{event.name}</span>?
                </p>
                <p className="text-xs text-white/40 mb-4">
                  This will send emails to all matching users. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSend}
                    className="flex-1 py-2.5 bg-[#59FFA0] text-[#121113] font-bold text-sm rounded-lg hover:bg-[#4de891] transition-colors"
                  >
                    Send Invites
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-2.5 bg-white/5 text-white/60 text-sm rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sendError && (
              <p className="text-sm text-red-400 mb-3">{sendError}</p>
            )}

            {sendResult ? (
              <div className="w-full py-3.5 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl text-center text-sm font-semibold text-[#59FFA0]">
                ✓ Invites sent to {sendResult.sent_count.toLocaleString()} users
              </div>
            ) : !confirming && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={sending}
                className="w-full py-3.5 bg-[#59FFA0] text-[#121113] font-bold text-sm rounded-xl hover:bg-[#4de891] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  `Send Invites to ${reachDisplay} Users`
                )}
              </button>
            )}
          </div>

          {/* Previous Runs */}
          <div>
            <div className="border-t border-[#2a2a2a] mb-5" />
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Previous Runs</p>
            {event.invite_runs.length === 0 ? (
              <p className="text-sm text-white/20 italic">No invite runs yet</p>
            ) : (
              <div className="space-y-2.5">
                {event.invite_runs.map((run) => {
                  const tags = [
                    ...run.target_neighborhoods,
                    ...run.target_vibes,
                    ...run.target_age_ranges,
                  ];
                  return (
                    <div key={run.id} className="text-sm leading-relaxed">
                      <span className="text-white/40">
                        {formatRunDate(run.created_at)}
                      </span>
                      <span className="text-white/20 mx-1.5">—</span>
                      <span className="text-white/60">
                        sent to{' '}
                        <span className="text-[#59FFA0] font-semibold">
                          {run.sent_count.toLocaleString()}
                        </span>{' '}
                        users
                      </span>
                      {tags.length > 0 && (
                        <>
                          <span className="text-white/20 mx-1.5">—</span>
                          <span className="text-white/30 text-xs">
                            {tags.map(pillLabel).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </SectionCard>

    </div>
  );
}
