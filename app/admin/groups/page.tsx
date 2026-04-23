'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface OrganizerAssignment {
  assignment_id: string;
  promoter_id: string;
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  assigned_at: string;
}

interface Group {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  card_image_url: string | null;
  accent_color: string | null;
  category: string | null;
  member_count: number;
  is_active: boolean;
  sort_order: number;
  organizers: OrganizerAssignment[];
}

interface OrganizerUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface CardMessage {
  type: 'success' | 'error';
  text: string;
}

interface ConfirmDialog {
  groupId: string;
  assignmentId: string;
  displayName: string | null;
}

function GroupSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-48 bg-white/10 rounded" />
            <div className="h-5 w-20 bg-white/10 rounded-full" />
          </div>
          <div className="h-4 w-64 bg-white/10 rounded" />
          <div className="h-px bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-white/10 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-40 bg-white/10 rounded-full" />
              <div className="h-8 w-36 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrganizerSearchInput({
  groupId,
  onAssign,
}: {
  groupId: string;
  onAssign: (groupId: string, userId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrganizerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/groups/users?search=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data ?? []);
        setNoResults((json.data ?? []).length === 0);
        setOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length === 0) {
      setOpen(false);
      setResults([]);
      setNoResults(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(val.trim()), 300);
  };

  const handleSelect = async (user: OrganizerUser) => {
    setQuery('');
    setOpen(false);
    setResults([]);
    await onAssign(groupId, user.id);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fullName = (u: OrganizerUser) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown';

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search by name or email…"
        className="w-full bg-white/5 border border-white/15 text-[#F9FDFF] placeholder-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/20 transition-colors"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#59FFA0] rounded-full animate-spin" />
        </div>
      )}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1a1a1f] border border-white/20 rounded-lg shadow-xl overflow-hidden">
          {noResults ? (
            <p className="px-4 py-3 text-sm text-[#7DD8E8] leading-relaxed">
              No organizer-role users found. Go to{' '}
              <a href="/admin/users" className="text-[#59FFA0] hover:underline">
                User Management
              </a>{' '}
              to assign the organizer role first.
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-white/5">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => handleSelect(u)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-[#F9FDFF] font-medium">{fullName(u)}</span>
                    {u.email && (
                      <span className="ml-2 text-xs text-[#7DD8E8]">{u.email}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  onAssign,
  onRemove,
}: {
  group: Group;
  onAssign: (groupId: string, userId: string) => Promise<void>;
  onRemove: (groupId: string, assignmentId: string, displayName: string | null) => void;
}) {
  const accentColor = group.accent_color || '#59FFA0';

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl"
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
    >
      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          <h2 className="text-lg font-slab-serif font-bold text-[#F9FDFF] leading-tight">
            {group.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {group.category && (
              <span className="px-2 py-0.5 rounded-full text-xs font-label uppercase tracking-wide bg-white/10 text-[#7DD8E8] border border-white/10">
                {group.category}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-label uppercase tracking-wide border ${
                group.is_active
                  ? 'bg-[#59FFA0]/15 text-[#59FFA0] border-[#59FFA0]/30'
                  : 'bg-white/10 text-white/40 border-white/10'
              }`}
            >
              {group.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-[#7DD8E8] font-sans">
              {group.member_count.toLocaleString()} member{group.member_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {group.tagline && (
          <p className="text-sm text-white/50 font-sans leading-snug -mt-1">{group.tagline}</p>
        )}

        <div className="h-px bg-white/8" />

        {/* Current organizers */}
        <div className="space-y-2">
          <p className="text-xs font-label uppercase tracking-wider text-[#7DD8E8]">
            Current Organizers
          </p>
          {group.organizers.length === 0 ? (
            <p className="text-sm text-white/30 font-sans italic">No organizers assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.organizers.map((o) => (
                <div
                  key={o.assignment_id}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white/5 border border-white/10 rounded-full"
                >
                  <span className="text-sm text-[#F9FDFF] font-medium leading-none">
                    {o.display_name ?? 'Unknown'}
                  </span>
                  {o.email && (
                    <span className="text-xs text-[#7DD8E8] leading-none">{o.email}</span>
                  )}
                  <button
                    onClick={() => onRemove(group.id, o.assignment_id, o.display_name)}
                    className="ml-0.5 flex items-center justify-center w-5 h-5 rounded-full text-red-400 hover:bg-red-400/20 transition-colors text-xs font-bold leading-none"
                    title="Remove organizer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign organizer */}
        <div className="space-y-2">
          <p className="text-xs font-label uppercase tracking-wider text-[#7DD8E8]">
            Assign Organizer
          </p>
          <OrganizerSearchInput groupId={group.id} onAssign={onAssign} />
        </div>
      </div>
    </div>
  );
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cardMessages, setCardMessages] = useState<Record<string, CardMessage>>({});
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/groups');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load groups');
      setGroups(json.data ?? []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const setCardMessage = (groupId: string, msg: CardMessage) => {
    setCardMessages((prev) => ({ ...prev, [groupId]: msg }));
    setTimeout(() => {
      setCardMessages((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    }, 4000);
  };

  const handleAssign = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/groups/${groupId}/organizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (!json.success) {
        setCardMessage(groupId, { type: 'error', text: json.error || 'Failed to assign organizer' });
        return;
      }
      setCardMessage(groupId, { type: 'success', text: 'Organizer assigned successfully' });
      await fetchGroups();
    } catch {
      setCardMessage(groupId, { type: 'error', text: 'Failed to assign organizer' });
    }
  };

  const handleRemoveIntent = (groupId: string, assignmentId: string, displayName: string | null) => {
    setConfirmDialog({ groupId, assignmentId, displayName });
  };

  const handleRemoveConfirm = async () => {
    if (!confirmDialog) return;
    const { groupId, assignmentId } = confirmDialog;
    setConfirmDialog(null);
    try {
      const res = await fetch(`/api/v1/admin/groups/${groupId}/organizers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      const json = await res.json();
      if (!json.success) {
        setCardMessage(groupId, { type: 'error', text: json.error || 'Failed to remove organizer' });
        return;
      }
      setCardMessage(groupId, { type: 'success', text: 'Organizer removed' });
      await fetchGroups();
    } catch {
      setCardMessage(groupId, { type: 'error', text: 'Failed to remove organizer' });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-slab-serif font-bold text-white">
          Group Management
        </h1>
        <p className="mt-1 text-sm font-sans text-[#7DD8E8]">
          Assign organizers to community groups
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && <GroupSkeleton />}

      {/* Error state */}
      {!loading && fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-red-400 font-sans text-sm">{fetchError}</p>
          <button
            onClick={() => { setLoading(true); fetchGroups(); }}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#7DD8E8] text-sm hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Groups list */}
      {!loading && !fetchError && (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-[#7DD8E8] font-sans text-sm text-center py-12">
              No groups found.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <GroupCard
                group={group}
                onAssign={handleAssign}
                onRemove={handleRemoveIntent}
              />
              {/* Per-card inline message */}
              {cardMessages[group.id] && (
                <p
                  className={`text-xs font-sans px-1 ${
                    cardMessages[group.id].type === 'success'
                      ? 'text-[#59FFA0]'
                      : 'text-red-400'
                  }`}
                >
                  {cardMessages[group.id].text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-[#0E0E10] border border-white/15 rounded-xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-slab-serif font-bold text-lg">Remove Organizer</h3>
            <p className="text-[#7DD8E8] text-sm font-sans leading-relaxed">
              Remove{' '}
              <span className="text-[#F9FDFF] font-medium">
                {confirmDialog.displayName ?? 'this organizer'}
              </span>{' '}
              from this group? They will no longer have organizer access.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/15 text-[#7DD8E8] text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
