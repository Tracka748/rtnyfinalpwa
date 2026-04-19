'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

type Role = 'user' | 'promoter' | 'organizer' | 'admin';
type Tab = 'all' | 'promoters' | 'organizers' | 'admins';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: Role;
  created_at: string;
  neighborhood: string | null;
  bio: string | null;
  order_count?: number;
  total_spent?: number;
  promoter?: {
    display_name: string | null;
    instagram_handle: string | null;
    status: string;
  } | null;
}

const TAB_LABELS: Record<Tab, string> = {
  all: 'All Users',
  promoters: 'Promoters',
  organizers: 'Organizers',
  admins: 'Admins',
};

const TABS = Object.keys(TAB_LABELS) as Tab[];

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case 'admin':     return 'bg-[#59FFA0]/15 text-[#59FFA0] border border-[#59FFA0]/30';
    case 'promoter':  return 'bg-[#1AC8ED]/15 text-[#1AC8ED] border border-[#1AC8ED]/30';
    case 'organizer': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    default:          return 'bg-white/10 text-[#7DD8E8] border border-white/15';
  }
}

function PromoterStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'approved'
      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
      : status === 'rejected'
      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
      : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function Avatar({ firstName, lastName }: { firstName: string | null; lastName: string | null }) {
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-[#1AC8ED]/20 border border-[#1AC8ED]/30 flex items-center justify-center text-xs font-bold text-[#1AC8ED] shrink-0">
      {initials}
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-[#7DD8E8] text-sm">
      No {label.toLowerCase()} found
    </div>
  );
}

interface ConfirmDialog {
  userId: string;
  userName: string;
  action: 'revoke-organizer' | 'revoke-admin';
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ all: 0, promoters: 0, organizers: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/v1/admin/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        if (json.meta?.currentProfileId) setCurrentProfileId(json.meta.currentProfileId);
        setCounts((prev) => ({ ...prev, [tab]: json.data.length }));
      } else {
        toast.error(json.error ?? 'Failed to load users');
        setUsers([]);
      }
    } catch {
      toast.error('Network error loading users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: Role, prevRole: Role) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Role updated');
      } else {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: prevRole } : u)));
        toast.error(json.error ?? 'Failed to update role');
      }
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: prevRole } : u)));
      toast.error('Network error');
    }
  }

  async function handleRevokeRole(userId: string) {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Role revoked');
        setConfirmDialog(null);
        fetchUsers();
      } else {
        toast.error(json.error ?? 'Failed to revoke role');
      }
    } catch {
      toast.error('Network error');
    }
  }

  function userName(u: Profile): string {
    return (
      [u.first_name, u.last_name].filter(Boolean).join(' ') ||
      u.email ||
      u.id
    );
  }

  const th = 'px-3 py-2.5 text-left text-xs font-label uppercase tracking-wider text-[#7DD8E8] whitespace-nowrap';
  const td = 'px-3 py-3 text-sm text-[#F9FDFF]';
  const tdMuted = `${td} text-[#7DD8E8]`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-slab-serif font-bold text-white">User Management</h1>
        <p className="mt-1 text-sm font-sans text-[#7DD8E8]">
          Manage user roles and platform access
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={[
              'px-4 py-2.5 text-sm font-medium font-sans border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-[#59FFA0] text-[#59FFA0]'
                : 'border-transparent text-[#7DD8E8] hover:text-white',
            ].join(' ')}
          >
            {TAB_LABELS[t]}
            {counts[t] > 0 && (
              <span
                className={[
                  'ml-2 px-1.5 py-0.5 rounded text-xs',
                  tab === t
                    ? 'bg-[#59FFA0]/15 text-[#59FFA0]'
                    : 'bg-white/10 text-[#7DD8E8]',
                ].join(' ')}
              >
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search — All Users only */}
      {tab === 'all' && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-sm px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-[#F9FDFF] text-sm font-sans placeholder:text-[#7DD8E8]/40 focus:outline-none focus:border-[#1AC8ED]/50 transition-colors"
        />
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton cols={tab === 'all' ? 7 : tab === 'promoters' ? 6 : tab === 'organizers' ? 6 : 4} />
      ) : users.length === 0 ? (
        <EmptyState label={TAB_LABELS[tab]} />
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">

            {/* ── All Users ─────────────────────────────── */}
            {tab === 'all' && (
              <table className="w-full font-sans">
                <thead className="bg-white/5">
                  <tr>
                    <th className={th}>User</th>
                    <th className={th}>Email</th>
                    <th className={th}>Role</th>
                    <th className={th}>Neighborhood</th>
                    <th className={th}>Joined</th>
                    <th className={`${th} text-right`}>Tickets</th>
                    <th className={`${th} text-right`}>Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={u.first_name} lastName={u.last_name} />
                          <span className="font-medium whitespace-nowrap">
                            {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                          </span>
                        </div>
                      </td>
                      <td className={tdMuted}>{u.email ?? '—'}</td>
                      <td className={td}>
                        <select
                          value={u.role}
                          disabled={u.id === currentProfileId}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as Role, u.role)
                          }
                          className={[
                            'text-xs font-medium px-2 py-1 rounded border appearance-none cursor-pointer bg-transparent',
                            'disabled:opacity-40 disabled:cursor-not-allowed',
                            roleBadgeClasses(u.role),
                          ].join(' ')}
                        >
                          {(['user', 'promoter', 'organizer', 'admin'] as Role[]).map((r) => (
                            <option key={r} value={r} className="bg-[#0E0E10] text-white">
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={tdMuted}>{u.neighborhood ?? '—'}</td>
                      <td className={`${tdMuted} whitespace-nowrap`}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className={`${td} text-right`}>{u.order_count ?? 0}</td>
                      <td className={`${td} text-right`}>
                        ${(u.total_spent ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Promoters ─────────────────────────────── */}
            {tab === 'promoters' && (
              <table className="w-full font-sans">
                <thead className="bg-white/5">
                  <tr>
                    <th className={th}>Display Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Instagram</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Events Created</th>
                    <th className={th}>Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className={td}>
                        {u.promoter?.display_name ||
                          [u.first_name, u.last_name].filter(Boolean).join(' ') ||
                          '—'}
                      </td>
                      <td className={tdMuted}>{u.email ?? '—'}</td>
                      <td className={td}>
                        {u.promoter?.instagram_handle ? (
                          <a
                            href={`https://instagram.com/${u.promoter.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1AC8ED] hover:underline"
                          >
                            @{u.promoter.instagram_handle}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={td}>
                        {u.promoter?.status ? (
                          <PromoterStatusBadge status={u.promoter.status} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${td} text-right`}>0</td>
                      <td className={`${tdMuted} whitespace-nowrap`}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Organizers ────────────────────────────── */}
            {tab === 'organizers' && (
              <table className="w-full font-sans">
                <thead className="bg-white/5">
                  <tr>
                    <th className={th}>Full Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Neighborhood</th>
                    <th className={th}>Bio</th>
                    <th className={th}>Joined</th>
                    <th className={th}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className={td}>
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className={tdMuted}>{u.email ?? '—'}</td>
                      <td className={tdMuted}>{u.neighborhood ?? '—'}</td>
                      <td className={`${tdMuted} max-w-[200px]`}>
                        <span title={u.bio ?? undefined}>
                          {u.bio
                            ? u.bio.length > 60
                              ? u.bio.slice(0, 60) + '…'
                              : u.bio
                            : '—'}
                        </span>
                      </td>
                      <td className={`${tdMuted} whitespace-nowrap`}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className={td}>
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              userId: u.id,
                              userName: userName(u),
                              action: 'revoke-organizer',
                            })
                          }
                          className="px-3 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                        >
                          Revoke Organizer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Admins ────────────────────────────────── */}
            {tab === 'admins' && (
              <table className="w-full font-sans">
                <thead className="bg-white/5">
                  <tr>
                    <th className={th}>Full Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Joined</th>
                    <th className={th}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className={td}>
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className={tdMuted}>{u.email ?? '—'}</td>
                      <td className={`${tdMuted} whitespace-nowrap`}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className={td}>
                        <button
                          disabled={u.id === currentProfileId}
                          onClick={() =>
                            setConfirmDialog({
                              userId: u.id,
                              userName: userName(u),
                              action: 'revoke-admin',
                            })
                          }
                          className="px-3 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Revoke Admin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-[#0E0E10] border border-white/15 rounded-xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-slab-serif font-bold text-lg">Confirm Action</h3>
            <p className="text-[#7DD8E8] text-sm font-sans leading-relaxed">
              {confirmDialog.action === 'revoke-admin'
                ? `Remove admin privileges from `
                : `Revoke organizer role from `}
              <span className="text-white font-medium">{confirmDialog.userName}</span>
              {'? Their role will be set to '}
              <span className="text-white font-medium">user</span>.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/15 text-[#7DD8E8] text-sm font-sans hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeRole(confirmDialog.userId)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-sans hover:bg-red-500/30 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
