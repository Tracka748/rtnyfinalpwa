'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { captureAndShareCard } from '@/lib/vibes/share-card-capture'
import VibeShareCard from '@/components/custom/homepage/VibeShareCard'

interface VibeTag {
  slug: string
  label: string
  emoji: string
  category: string
}

interface VibeIdentityShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FALLBACK_MESSAGE_DURATION_MS = 1800

export function VibeIdentityShareDialog({ open, onOpenChange }: VibeIdentityShareDialogProps) {
  const [tagCatalog, setTagCatalog] = useState<VibeTag[]>([])
  const [vibeTags, setVibeTags] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareFallbackMessage, setShareFallbackMessage] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  function reset() {
    setTagCatalog([])
    setVibeTags(null)
    setLoading(true)
    setSharing(false)
    setShareError('')
    setShareFallbackMessage('')
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // Fetch the user's saved vibes + the active tag catalog to resolve slugs into
  // label/emoji — same fetch/resolve pattern as ProfileVibesSection.tsx.
  useEffect(() => {
    if (!open) return
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
        console.error('Failed to load vibes for share card', err)
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
  }, [open])

  const resolvedTags = (vibeTags ?? [])
    .map((slug) => tagCatalog.find((t) => t.slug === slug))
    .filter((t): t is VibeTag => Boolean(t))

  const hasVibes = resolvedTags.length > 0

  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    setShareError('')
    setShareFallbackMessage('')

    const result = await captureAndShareCard(cardRef.current, { fileName: 'my-vibes.png' })

    if (result.status === 'shared') {
      handleClose(false)
    } else if (result.status === 'downloaded') {
      setShareFallbackMessage('Image saved — share it wherever you like!')
      setTimeout(() => handleClose(false), FALLBACK_MESSAGE_DURATION_MS)
    } else if (result.status === 'error') {
      setShareError(result.message)
    }
    // 'cancelled' — user backed out of the native share sheet; stay put, no error.

    setSharing(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share My Vibes</DialogTitle>
          <DialogDescription>Here&apos;s your card — share it or save the image.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="aspect-square w-[360px] max-w-full rounded-2xl bg-white/5 animate-pulse" />
          ) : hasVibes ? (
            <div ref={cardRef}>
              <VibeShareCard variant="identity" tags={resolvedTags} />
            </div>
          ) : (
            <p className="text-sm text-foreground/40 text-center py-8">
              You haven&apos;t set your vibes yet.
            </p>
          )}

          {shareError && <p className="text-sm text-red-400">{shareError}</p>}
          {shareFallbackMessage && (
            <p className="text-sm text-accent-primary text-center">{shareFallbackMessage}</p>
          )}

          {hasVibes && (
            <Button
              onClick={handleShare}
              disabled={sharing || loading}
              className="w-full bg-accent text-black hover:bg-accent/90 touch-manipulation"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
