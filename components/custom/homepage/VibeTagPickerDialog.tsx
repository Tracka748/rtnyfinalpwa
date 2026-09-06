'use client'

import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import VibeShareCard from './VibeShareCard'

interface VibeTag {
  slug: string
  label: string
  emoji: string
  category: string
}

interface MatchedEvent {
  id: string
  name: string
  venue_name: string | null
  event_date: string
  flyer_image_url: string | null
}

interface VibeTagPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'prompt' | 'personalized'
  onShareComplete?: () => void
}

type PromptStep = 'select' | 'preview'

const MAX_TAGS = 3
const CAPTION_MAX_LENGTH = 280
const SHARE_IMAGE_PIXEL_RATIO = 3
const FALLBACK_MESSAGE_DURATION_MS = 1800

function joinGrammatically(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function buildCaptionTemplate(selected: string[], tags: VibeTag[]): string {
  if (selected.length === 0) return ''
  const labels = selected
    .map((slug) => tags.find((t) => t.slug === slug)?.label)
    .filter((label): label is string => Boolean(label))
  return `Rochester, what are we getting into tonight? Looking for ${joinGrammatically(labels)}.`.slice(
    0,
    CAPTION_MAX_LENGTH
  )
}

interface TagGridProps {
  tags: VibeTag[]
  loading: boolean
  selected: string[]
  onToggle: (slug: string) => void
}

// Shared by both modes — prompt and personalized pick from the same vocabulary
// with the same 1-3 selection rule, just different copy/submit targets around it.
function TagGrid({ tags, loading, selected, onToggle }: TagGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.slug)
        const atMax = !isSelected && selected.length >= MAX_TAGS
        return (
          <button
            key={tag.slug}
            type="button"
            onClick={() => onToggle(tag.slug)}
            disabled={atMax}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition-all touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'border-accent-secondary bg-accent-secondary/10'
                : 'border-border bg-surface hover:border-accent-secondary/40'
            )}
          >
            <span className="text-2xl leading-none">{tag.emoji}</span>
            <span className="font-sans text-xs text-text-primary leading-tight">{tag.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function VibeTagPickerDialog({
  open,
  onOpenChange,
  mode,
  onShareComplete,
}: VibeTagPickerDialogProps) {
  const [tags, setTags] = useState<VibeTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [hasExistingVibes, setHasExistingVibes] = useState(false)
  const [caption, setCaption] = useState('')
  const [captionTouched, setCaptionTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [capReached, setCapReached] = useState(false)

  // Prompt-mode-only preview step. Personalized mode never touches this.
  const [step, setStep] = useState<PromptStep>('select')
  const [matchedEvents, setMatchedEvents] = useState<MatchedEvent[]>([])
  const [matchedEventsLoading, setMatchedEventsLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareFallbackMessage, setShareFallbackMessage] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  function reset() {
    setTags([])
    setTagsLoading(false)
    setSelected([])
    setHasExistingVibes(false)
    setCaption('')
    setCaptionTouched(false)
    setSubmitting(false)
    setError('')
    setCapReached(false)
    setStep('select')
    setMatchedEvents([])
    setMatchedEventsLoading(false)
    setSharing(false)
    setShareError('')
    setShareFallbackMessage('')
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // Fetch the active tag vocabulary once, when the dialog opens. In personalized
  // mode, also fetch the user's current vibes in parallel so the grid can open
  // pre-selected and the copy/button can tell "first time" from "editing" apart.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setTagsLoading(true)
      try {
        if (mode === 'personalized') {
          const [tagsRes, userVibesRes] = await Promise.all([
            fetch('/api/v1/vibe-tags'),
            fetch('/api/v1/user-vibes'),
          ])
          const tagsJson = await tagsRes.json()
          const userVibesJson = await userVibesRes.json()
          if (cancelled) return
          setTags(tagsRes.ok ? tagsJson.tags ?? [] : [])
          if (userVibesRes.ok && Array.isArray(userVibesJson.vibe_tags)) {
            setSelected(userVibesJson.vibe_tags)
            setHasExistingVibes(true)
          } else {
            setHasExistingVibes(false)
          }
        } else {
          const res = await fetch('/api/v1/vibe-tags')
          const json = await res.json()
          if (!cancelled) setTags(res.ok ? json.tags ?? [] : [])
        }
      } catch {
        if (!cancelled) setTags([])
      } finally {
        if (!cancelled) setTagsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, mode])

  // Live-regenerate the caption template from the current selection — but stop
  // once the user has typed into the field themselves, so their edits aren't
  // clobbered by a later tag toggle. Prompt-mode only; personalized has no caption.
  useEffect(() => {
    if (mode !== 'prompt' || captionTouched) return
    setCaption(buildCaptionTemplate(selected, tags))
  }, [mode, selected, tags, captionTouched])

  // Fetch matched events once the share is recorded and we move into preview.
  // A failed fetch here just means an empty matches list — the share already
  // happened, so this must never block the preview from showing.
  useEffect(() => {
    if (step !== 'preview') return
    let cancelled = false
    async function fetchMatches() {
      setMatchedEventsLoading(true)
      try {
        const params = new URLSearchParams({ tags: selected.join(',') })
        const res = await fetch(`/api/v1/vibe-shares/matched-events?${params.toString()}`)
        const json = await res.json()
        if (!cancelled) setMatchedEvents(res.ok ? json.events ?? [] : [])
      } catch {
        if (!cancelled) setMatchedEvents([])
      } finally {
        if (!cancelled) setMatchedEventsLoading(false)
      }
    }
    fetchMatches()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function toggleTag(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, slug]
    })
  }

  function goBackToSelect() {
    setStep('select')
    setMatchedEvents([])
    setShareError('')
    setShareFallbackMessage('')
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    setCapReached(false)
    try {
      if (mode === 'personalized') {
        const res = await fetch('/api/v1/user-vibes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vibe_tags: selected }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Failed to save your vibes')
          return
        }
        handleClose(false)
        onShareComplete?.()
        return
      }

      const res = await fetch('/api/v1/vibe-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, vibe_tags: selected, caption: caption.trim() }),
      })

      if (res.status === 429) {
        setCapReached(true)
        return
      }

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to share your vibe')
        return
      }

      // Share is recorded — move to the preview/capture step instead of closing.
      setStep('preview')
    } catch {
      setError(mode === 'personalized' ? 'Failed to save your vibes' : 'Failed to share your vibe')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    setShareError('')
    setShareFallbackMessage('')
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: SHARE_IMAGE_PIXEL_RATIO })
      if (!blob) {
        setShareError('Something went wrong creating your share image — try again.')
        return
      }

      const file = new File([blob], 'vibe-share.png', { type: 'image/png' })
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })

      if (canShareFiles) {
        await navigator.share({ files: [file], text: caption })
        handleClose(false)
        onShareComplete?.()
        return
      }

      // Fallback for browsers without file-sharing support (most desktop browsers).
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'vibe-share.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      try {
        await navigator.clipboard.writeText(caption)
      } catch {
        // Best-effort — the image download already succeeded either way.
      }

      setShareFallbackMessage('Image saved — share it wherever you like! Caption copied to clipboard.')
      setTimeout(() => {
        handleClose(false)
        onShareComplete?.()
      }, FALLBACK_MESSAGE_DURATION_MS)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled the native share sheet — stay on preview, no error.
        return
      }
      console.error('vibe share error:', err)
      setShareError('Something went wrong sharing — try again.')
    } finally {
      setSharing(false)
    }
  }

  const isPersonalized = mode === 'personalized'
  const isPreview = mode === 'prompt' && step === 'preview'

  const title = isPreview
    ? 'Preview & Share'
    : isPersonalized
      ? hasExistingVibes
        ? 'Edit Your Vibes'
        : 'Set Your Vibes'
      : "What's the Vibe?"

  const description = isPreview
    ? "Here's your card — share it or save the image."
    : isPersonalized
      ? 'Pick 1–3 vibes that describe your go-to nights out.'
      : "Pick 1–3 vibes and let your followers know what's happening tonight."

  const submitLabel = isPersonalized
    ? submitting
      ? 'Saving…'
      : hasExistingVibes
        ? 'Update My Vibes'
        : 'Save My Vibes'
    : submitting
      ? 'Sharing…'
      : 'Share the Vibe'

  const selectedTagDetails = selected
    .map((slug) => tags.find((t) => t.slug === slug))
    .filter((t): t is VibeTag => Boolean(t))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        {isPreview && (
          <button
            type="button"
            onClick={goBackToSelect}
            aria-label="Back"
            className="absolute left-4 top-4 rounded-md p-1 text-foreground/60 hover:text-foreground transition-colors focus:outline-none touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isPreview ? (
          <div className="flex flex-col items-center gap-4">
            {matchedEventsLoading ? (
              <div className="aspect-square w-[360px] max-w-full rounded-2xl bg-white/5 animate-pulse" />
            ) : (
              <div ref={cardRef}>
                <VibeShareCard tags={selectedTagDetails} caption={caption} matchedEvents={matchedEvents} />
              </div>
            )}

            {shareError && <p className="text-sm text-red-400">{shareError}</p>}
            {shareFallbackMessage && (
              <p className="text-sm text-accent-primary text-center">{shareFallbackMessage}</p>
            )}

            <Button
              onClick={handleShare}
              disabled={sharing || matchedEventsLoading}
              className="w-full bg-accent text-black hover:bg-accent/90 touch-manipulation"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <TagGrid tags={tags} loading={tagsLoading} selected={selected} onToggle={toggleTag} />

            {!isPersonalized && (
              <div className="space-y-1.5">
                <label className="font-label text-xs uppercase tracking-widest text-foreground/40">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => {
                    setCaptionTouched(true)
                    setCaption(e.target.value.slice(0, CAPTION_MAX_LENGTH))
                  }}
                  maxLength={CAPTION_MAX_LENGTH}
                  rows={3}
                  placeholder="Select a few vibes to generate a caption…"
                  className="w-full bg-[#121113] border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-sm placeholder:text-foreground/30 outline-none focus:border-accent/50 transition-colors resize-none"
                />
                <p className="text-right text-[11px] text-foreground/30">
                  {caption.length}/{CAPTION_MAX_LENGTH}
                </p>
              </div>
            )}

            {capReached && (
              <p className="text-sm text-yellow-400">
                You&apos;ve hit today&apos;s vibe-share limit — try again tomorrow.
              </p>
            )}
            {error && !capReached && <p className="text-sm text-red-400">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={selected.length === 0 || submitting}
              className="w-full bg-accent text-black hover:bg-accent/90 touch-manipulation"
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
