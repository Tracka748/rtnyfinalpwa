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

function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
      <div className="h-40 bg-white/10" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="flex gap-2 mt-4">
          <div className="h-9 bg-white/10 rounded-lg flex-1" />
          <div className="h-9 bg-white/10 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}

export default function OrganizerGroupsPage() {
  const [groups, setGroups] = useState<OrganizerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/organizer/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.data ?? []);
        }
      } catch (err) {
        console.error('[organizer/groups] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-slab-serif font-bold text-white">My Groups</h1>
        <p className="text-[#7DD8E8] mt-1 text-sm font-sans">
          Groups you have been assigned to organize.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-4xl mb-4 block">👥</span>
          <h3 className="text-lg font-semibold text-white mb-2">No groups assigned</h3>
          <p className="text-[#7DD8E8] text-sm font-sans max-w-xs mx-auto">
            You haven&apos;t been assigned to any groups yet. Contact an admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col"
              style={
                group.accent_color
                  ? {
                      borderLeftColor: group.accent_color,
                      borderLeftWidth: '4px',
                      boxShadow: `0 0 18px 0 ${group.accent_color}22`,
                    }
                  : undefined
              }
            >
              {/* Cover image */}
              {group.card_image_url ? (
                <img
                  src={group.card_image_url}
                  alt={group.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-white/10 flex items-center justify-center">
                  <span className="text-5xl">👥</span>
                </div>
              )}

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-white font-sans leading-snug">
                    {group.name}
                  </h3>
                  {!group.is_active && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-label">
                      Inactive
                    </span>
                  )}
                </div>

                {group.tagline && (
                  <p className="text-sm text-[#7DD8E8] font-sans line-clamp-2 mb-3">
                    {group.tagline}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-auto mb-4">
                  {group.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#1AC8ED] font-label">
                      {group.category}
                    </span>
                  )}
                  <span className="text-xs text-[#7DD8E8] font-sans ml-auto">
                    {group.member_count.toLocaleString()} members
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/groups/${group.slug}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium font-sans bg-white/5 border border-white/15 text-[#7DD8E8] hover:bg-white/10 hover:text-white transition-colors"
                  >
                    View Group →
                  </Link>
                  <Link
                    href={`/organizer/posts?group=${group.slug}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium font-sans bg-[#59FFA0]/10 border border-[#59FFA0]/25 text-[#59FFA0] hover:bg-[#59FFA0]/20 transition-colors"
                  >
                    Manage Posts →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
