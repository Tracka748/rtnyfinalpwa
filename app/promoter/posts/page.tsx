'use client';

import { useState, useEffect } from 'react';

interface OrganizerGroup {
  id: string;
  slug: string;
  name: string;
}

interface GroupPost {
  id: string;
  group_id: string;
  group_name: string | null;
  author_id: string;
  title: string;
  body: string;
  post_type: 'announcement' | 'update' | 'poll';
  is_pinned: boolean;
  created_at: string;
}

const POST_TYPE_OPTIONS = [
  { value: 'announcement', label: 'Announcement', emoji: '📢' },
  { value: 'update', label: 'Update', emoji: '📣' },
  { value: 'poll', label: 'Poll', emoji: '🗳️' },
] as const;

const TYPE_BADGE: Record<GroupPost['post_type'], string> = {
  announcement: 'bg-[#59FFA0]/15 text-[#59FFA0] border border-[#59FFA0]/25',
  update: 'bg-[#1AC8ED]/15 text-[#1AC8ED] border border-[#1AC8ED]/25',
  poll: 'bg-amber-400/15 text-amber-400 border border-amber-400/25',
};

const TYPE_LABEL: Record<GroupPost['post_type'], string> = {
  announcement: '📢 Announcement',
  update: '📣 Update',
  poll: '🗳️ Poll',
};

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 bg-white/5 rounded-lg" />
      ))}
    </div>
  );
}

export default function OrganizerPostsPage() {
  const [groups, setGroups] = useState<OrganizerGroup[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Form state
  const [selectedGroup, setSelectedGroup] = useState('');
  const [postType, setPostType] = useState<'announcement' | 'update' | 'poll'>('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchPosts();
  }, []);

  async function fetchGroups() {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/v1/organizer/groups');
      if (res.ok) {
        const data = await res.json();
        const g: OrganizerGroup[] = data.data ?? [];
        setGroups(g);
        if (g.length > 0) setSelectedGroup(g[0].id);
      }
    } catch (err) {
      console.error('[organizer/posts] fetch groups error:', err);
    } finally {
      setLoadingGroups(false);
    }
  }

  async function fetchPosts() {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/v1/organizer/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data ?? []);
      }
    } catch (err) {
      console.error('[organizer/posts] fetch posts error:', err);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccess(false);

    if (!selectedGroup) {
      setFormError('Please select a group.');
      return;
    }
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!body.trim()) {
      setFormError('Body is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/organizer/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          title: title.trim(),
          body: body.trim(),
          post_type: postType,
          is_pinned: isPinned,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error ?? 'Failed to create post.');
        return;
      }

      // Prepend to posts list
      const newPost: GroupPost = {
        ...data.data,
        group_name: groups.find((g) => g.id === data.data.group_id)?.name ?? null,
      };
      setPosts((prev) => [newPost, ...prev]);

      // Reset form
      setTitle('');
      setBody('');
      setIsPinned(false);
      setPostType('announcement');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.error('[organizer/posts] submit error:', err);
      setFormError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    // Optimistic removal
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(id);

    try {
      const res = await fetch(`/api/v1/organizer/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to delete post.');
        // Re-fetch to restore
        fetchPosts();
      }
    } catch (err) {
      console.error('[organizer/posts] delete error:', err);
      fetchPosts();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-slab-serif font-bold text-white">Posts</h1>
        <p className="text-[#7DD8E8] mt-1 text-sm font-sans">
          Create and manage announcements, updates, and polls for your groups.
        </p>
      </div>

      {/* Create Post Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-slab-serif font-semibold text-white mb-5">Create Post</h2>

        {success && (
          <div className="mb-4 px-4 py-3 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg text-[#59FFA0] text-sm font-sans">
            ✓ Post published successfully!
          </div>
        )}
        {formError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-sans">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Group selector */}
            <div>
              <label className="block text-xs font-label text-[#7DD8E8] mb-1.5 uppercase tracking-wide">
                Group
              </label>
              {loadingGroups ? (
                <div className="h-10 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30"
                  required
                >
                  {groups.length === 0 && (
                    <option value="">No groups assigned</option>
                  )}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#0E0E10]">
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Post type */}
            <div>
              <label className="block text-xs font-label text-[#7DD8E8] mb-1.5 uppercase tracking-wide">
                Post Type
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as typeof postType)}
                className="w-full bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30"
              >
                {POST_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0E0E10]">
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-label text-[#7DD8E8] mb-1.5 uppercase tracking-wide">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title…"
              className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-label text-[#7DD8E8] mb-1.5 uppercase tracking-wide">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your post content here…"
              rows={4}
              className="w-full bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-[#59FFA0]/50 focus:ring-1 focus:ring-[#59FFA0]/30 resize-y"
              required
            />
          </div>

          {/* Pin + Submit */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-[#59FFA0]"
              />
              <span className="text-sm font-sans text-[#7DD8E8]">📌 Pin this post</span>
            </label>

            <button
              type="submit"
              disabled={submitting || groups.length === 0}
              className="px-5 py-2.5 bg-[#59FFA0] text-black text-sm font-semibold font-sans rounded-lg hover:bg-[#59FFA0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Publishing…' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-slab-serif font-semibold text-white">All Posts</h2>
        </div>

        {loadingPosts ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-14">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-white font-semibold mb-1">No posts yet</p>
            <p className="text-[#7DD8E8] text-sm font-sans">Create your first post above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Title</th>
                  <th className="text-center px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Pinned</th>
                  <th className="text-left px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-label text-[#7DD8E8] uppercase tracking-wide">Delete</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#7DD8E8] font-sans whitespace-nowrap">
                      {post.group_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label whitespace-nowrap ${TYPE_BADGE[post.post_type]}`}>
                        {TYPE_LABEL[post.post_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-sans max-w-[260px] truncate">
                      {post.title}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {post.is_pinned ? (
                        <span title="Pinned">📌</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#7DD8E8] font-sans whitespace-nowrap">
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors text-xs font-sans px-2 py-1 rounded hover:bg-red-400/10"
                        title="Delete post"
                      >
                        {deletingId === post.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
