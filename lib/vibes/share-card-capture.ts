// lib/vibes/share-card-capture.ts
// Shared capture + share/download mechanics for vibe share cards. Used by both
// VibeTagPickerDialog (prompt + personalized share) and VibeIdentityShareDialog.
// Callers own their own UI state (loading, messages, close-on-success) — this
// function only does the capture/share/download/clipboard work and reports
// what happened.

import { toBlob } from 'html-to-image'

const SHARE_IMAGE_PIXEL_RATIO = 3

export type ShareCardResult =
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export async function captureAndShareCard(
  element: HTMLElement,
  options: { fileName?: string; caption?: string } = {}
): Promise<ShareCardResult> {
  const fileName = options.fileName ?? 'vibe-share.png'
  const caption = options.caption ?? ''

  try {
    const blob = await toBlob(element, { pixelRatio: SHARE_IMAGE_PIXEL_RATIO })
    if (!blob) {
      return { status: 'error', message: 'Something went wrong creating your share image — try again.' }
    }

    const file = new File([blob], fileName, { type: 'image/png' })
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })

    if (canShareFiles) {
      await navigator.share({ files: [file], text: caption })
      return { status: 'shared' }
    }

    // Fallback for browsers without file-sharing support (most desktop browsers).
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    if (caption) {
      try {
        await navigator.clipboard.writeText(caption)
      } catch {
        // Best-effort — the image download already succeeded either way.
      }
    }

    return { status: 'downloaded' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User cancelled the native share sheet — not an error.
      return { status: 'cancelled' }
    }
    console.error('vibe share capture error:', err)
    return { status: 'error', message: 'Something went wrong sharing — try again.' }
  }
}
