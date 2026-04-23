'use client';

import { useState, useEffect } from 'react';

interface OrganizerGroup {
  id: string;
  name: string;
}

interface Member {
  id: string;
  user_id: string;
  group_id: string;
  group_name: string | null;
  joined_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function initials(first: string | null, last: string | null, email: string | null): string {
  if (first || last) {
    return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase();
  }
  if (email) return email.charAt(0).toUpperCase();
  return '?';
}

function fullName(first: string | null, last: string | null, email: string | null): string {
  const name = [first, last].filter(Boolean).join(' ');
  return name || email || 'Unknown';
}

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 h-12">
          <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/10 rounded w-40" />
            <div className="h-2.5 bg-white/10 rounded w-56" />
          </div>
          <div className="h-3 bg-white/10 rounded w-24 hidden sm:block" />
          <div className="h-3 bg-white/10 rounded w-20 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

export default function OrganizerMembersPage() {
  const [groups, setGroups] = useState<OrganizerGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Load groups once on mount
  useEffect(() => {
    async function loadGroups() {
      setLoadingGroups(true);
      try {
        const res = await fetch('/api/v1/organizer/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.data ?? []);
        }
      } catch (err) {
        console.error('[organizer/members] load groups error:', err);
      } finally {
        setLoadingGroups(false);
      }
    }
    loadGroups();
  }, []);

  // Load members whenever group filter changes
  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      try {
        const url = selectedGroup
          ? `/api/v1/organizer/members?group_id=${encodeURIComponent(selectedGroup)}`
          : '/api/v1/organizer/members';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.data ?? []);
        }
      } catch (err) {
        console.error('[organizer/members] load members error:', err);
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
  }, [selectedGroup]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-slab-serif font-bold text-white">Members</h1>
        <p className="text-[#7DD8E8] mt-1 text-sm font-sans">
          View active members across your groups.
        </p>
      </div>

      {/* Filter + count row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {loadingGroups ? (
          <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse" />
        ) : (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30 max-w-xs"
          >
            <option value="" className="bg-[#0E0E10]">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#0E0E10]">
                {g.name}
              </option>
            ))}
          </select>
        )}

        {!loadingMembers && (
          <p className="text-sm font-sans text-[#7DD8E8]">
            <span className="text-[#1AC8ED] font-semibold">{members.length}</span>{' '}
            {members.length === 1 ? 'member' : 'members'}
          </p>
        )}
      </div>

      {/* Table card */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {loadingMembers ? (
          <TableSkeleton />
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">🧑‍🤝‍🧑</span>
            <p className="text-white font-semibold mb-1">No members found</p>
            <p className="text-[#7DD8E8] text-sm font-sans">
              {selectedGroup
                ? 'This group has no active members yet.'
                : 'Your groups have no active members yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">
                    Member
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide hidden md:table-cell">
                    Group
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide hidden lg:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const ini = initials(member.first_name, member.last_name, member.email);
                  const name = fullName(member.first_name, member.last_name, member.email);
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Avatar + name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1AC8ED]/20 border border-[#1AC8ED]/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-[#1AC8ED] font-sans">
                              {ini}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-sans font-medium truncate">{name}</p>
                            {/* Show email inline on small screens */}
                            <p className="text-xs text-[#7DD8E8] font-sans truncate sm:hidden">
                              {member.email ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-[#7DD8E8] font-sans hidden sm:table-cell truncate max-w-[200px]">
                        {member.email ?? '—'}
                      </td>

                      {/* Group */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#1AC8ED] font-label">
                          {member.group_name ?? '—'}
                        </span>
                      </td>

                      {/* Joined date */}
                      <td className="px-4 py-3 text-[#7DD8E8] font-sans whitespace-nowrap hidden lg:table-cell">
                        {new Date(member.joined_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
