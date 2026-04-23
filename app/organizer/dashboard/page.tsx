'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrganizerGroup {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  card_image_url: string | null;
  accent_color: string | null;
  category: string | null;
  member_count: number;
  is_active: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
      <div className="h-36 bg-white/10" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
      <div className="h-8 bg-white/10 rounded w-16 mb-2" />
      <div className="h-3 bg-white/10 rounded w-24" />
    </div>
  );
}

export default function OrganizerDashboardPage() {
  const [groups, setGroups] = useState<OrganizerGroup[]>([]);
  const [postCount, setPostCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [groupsRes, postsRes] = await Promise.all([
          fetch('/api/v1/organizer/groups'),
          fetch('/api/v1/organizer/posts?count=true'),
        ]);

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          if (groupsData.success) setGroups(groupsData.data ?? []);
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (postsData.success) setPostCount(postsData.data?.count ?? 0);
        }
      } catch (err) {
        console.error('[organizer/dashboard] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    // Pull email from header for display
    fetch('/api/v1/organizer/groups')
      .then((r) => {
        const email = r.headers.get('x-user-email');
        if (email) setUserEmail(email);
      })
      .catch(() => {});

    load();
  }, []);

  const totalMembers = groups.reduce((sum, g) => sum + (g.member_count ?? 0), 0);

  return (
    <>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-slab-serif font-bold text-white">Organizer Hub</h1>
        {userEmail && (
          <p className="text-[#1AC8ED] mt-1 text-sm font-sans">{userEmail}</p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-3xl font-bold text-[#59FFA0]">{groups.length}</p>
              <p className="text-sm text-[#7DD8E8] mt-1 font-sans">Total Groups</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-3xl font-bold text-[#1AC8ED]">{totalMembers}</p>
              <p className="text-sm text-[#7DD8E8] mt-1 font-sans">Total Members</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-3xl font-bold text-white">{postCount}</p>
              <p className="text-sm text-[#7DD8E8] mt-1 font-sans">Total Posts</p>
            </div>
          </>
        )}
      </div>

      {/* Groups Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-slab-serif font-semibold text-white">My Groups</h2>
        <Link
          href="/organizer/groups"
          className="text-sm text-[#59FFA0] hover:underline font-sans"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-4xl mb-4 block">👥</span>
          <h3 className="text-lg font-semibold text-white mb-2">No groups assigned</h3>
          <p className="text-[#7DD8E8] font-sans text-sm max-w-xs mx-auto">
            You haven&apos;t been assigned to any groups yet. Contact an admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/organizer/groups/${group.slug}`}
              className="block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.08] transition-colors"
              style={{
                borderLeft: group.accent_color
                  ? `4px solid ${group.accent_color}`
                  : undefined,
              }}
            >
              {/* Cover image */}
              {group.card_image_url ? (
                <img
                  src={group.card_image_url}
                  alt={group.name}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-white/10 flex items-center justify-center">
                  <span className="text-4xl">👥</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-white font-sans leading-snug">
                    {group.name}
                  </h3>
                  {!group.is_active && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#7DD8E8] font-label">
                      Inactive
                    </span>
                  )}
                </div>

                {group.tagline && (
                  <p className="text-sm text-[#7DD8E8] font-sans line-clamp-2 mb-3">
                    {group.tagline}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {group.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#1AC8ED] font-label">
                      {group.category}
                    </span>
                  )}
                  <span className="text-xs text-[#7DD8E8] font-sans ml-auto">
                    {group.member_count.toLocaleString()} members
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
