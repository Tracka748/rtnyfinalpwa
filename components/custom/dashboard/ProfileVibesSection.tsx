'use client'

import { useCallback, useEffect, useState } from 'react'
import { Share2, Sparkles, UserCog } from 'lucide-react'
import VibeTagPickerDialog from '@/components/custom/homepage/VibeTagPickerDialog'
import { VibeIdentityShareDialog } from '@/components/custom/dashboard/VibeIdentityShareDialog'

interface VibeTag {
  slug: string
  label: string
  emoji: string
  category: string
}

export function ProfileVibesSection() {
  const [tagCatalog, setTagCatalog] = useState<VibeTag[]>([])
  const [vibeTags, setVibeTags] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Re-fetch just the user's saved vibes — used on mount and again after the
  // picker dialog saves, so this display updates without a page reload.
  const fetchUserVibes = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/user-vibes')
      const json = await res.json()
      setVibeTags(res.ok ? json.vibe_tags ?? null : null)
    } catch (err) {
      console.error('Failed to load user vibes', err)
      setVibeTags(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [vibesRes, tagsRes] = await Promise.all([
          fetch('/api/v1/user-vibes'),
          fetch('/api/v1/vibe-tags'),
        ])
        const [vibesJson, tagsJson] = await Promise.all([vibesRes.json(), tagsRes.json()])
        if (cancelled) return
        setVibeTags(vibesRes.ok ? vibesJson.vibe_tags ?? null : null)
        setTagCatalog(tagsRes.ok ? tagsJson.tags ?? [] : [])
      } catch (err) {
        console.error('Failed to load vibes', err)
        if (!cancelled) {
          setVibeTags(null)
          setTagCatalog([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const resolvedTags = (vibeTags ?? [])
    .map((slug) => tagCatalog.find((t) => t.slug === slug))
    .filter((t): t is VibeTag => Boolean(t))

  const hasVibes = resolvedTags.length > 0

  return (
    <>
      {/* Profile Controls (vibe display + actions) */}
      <div className="bg-card border border-white/5 rounded-2xl p-6 mt-8">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#59FFA0]/10 text-[#59FFA0]">
            <UserCog size={16} />
          </div>
          <h2 className="text-xl font-bold text-foreground font-slab-serif">
            Profile Controls
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : hasVibes ? (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {resolvedTags.map((tag) => (
              <span
                key={tag.slug}
                className="inline-flex items-center gap-1 rounded-full border-2 border-accent-secondary bg-accent-secondary/10 px-2.5 py-1"
              >
                <span className="text-sm leading-none">{tag.emoji}</span>
                <span className="font-sans text-xs font-semibold text-text-primary leading-tight">
                  {tag.label}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/40 mb-4">
            You haven&apos;t set your vibes yet.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setEditDialogOpen(true)}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#59FFA0]/10 text-[#59FFA0]">
              <Sparkles size={18} />
            </div>
            <span className="font-[family-name:var(--font-rokkitt)] text-sm font-bold text-[#F9FDFF] group-hover:text-[#59FFA0]">
              My Vibes
            </span>
          </button>

          {hasVibes && (
            <button
              type="button"
              onClick={() => setShareDialogOpen(true)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#59FFA0]/10 text-[#59FFA0]">
                <Share2 size={18} />
              </div>
              <span className="font-[family-name:var(--font-rokkitt)] text-sm font-bold text-[#F9FDFF] group-hover:text-[#59FFA0]">
                Share My Vibes
              </span>
            </button>
          )}
        </div>
      </div>

      <VibeTagPickerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="personalized"
        onShareComplete={fetchUserVibes}
      />

      <VibeIdentityShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
    </>
  )
}
