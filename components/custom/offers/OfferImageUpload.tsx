'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { text } from './styles'

// Offer photos live next to the partner's cover in the public partner-covers
// bucket. The storage policy allows the partner owner or an admin to write under
// {partnerId}/…, and the offers API only accepts URLs in this offer's folder.
const BUCKET = 'partner-covers'
const MAX_BYTES = 5 * 1024 * 1024
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

function extensionFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
  const fromType = file.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? ''
  const ext = (fromName || fromType || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext.slice(0, 5) || 'jpg'
}

export function offerImageFolder(partnerId: string, offerId: string): string {
  return `${partnerId.toLowerCase()}/offers/${offerId.toLowerCase()}`
}

type UploadResult = { url: string } | { error: string }

export async function uploadOfferImage(partnerId: string, offerId: string, file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' }
  if (file.size > MAX_BYTES) return { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The max is 5 MB.` }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const path = `${offerImageFolder(partnerId, offerId)}/${unique}.${extensionFor(file)}`
  try {
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' })
    if (error) {
      console.error('[OfferImageUpload] upload failed:', error.message)
      return { error: 'Upload failed. Check your connection and try again.' }
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl }
  } catch {
    return { error: 'Upload failed. Check your connection and try again.' }
  }
}

// Best effort: a failed delete only leaves an orphaned file; the offer row is updated regardless.
export async function removeOfferImage(url: string): Promise<void> {
  const index = url.indexOf(PUBLIC_MARKER)
  if (index === -1) return
  const path = decodeURIComponent(url.slice(index + PUBLIC_MARKER.length).split('?')[0])
  try {
    const { error } = await createBrowserSupabaseClient().storage.from(BUCKET).remove([path])
    if (error) console.warn('[OfferImageUpload] remove failed:', error.message)
  } catch {
    // ignore
  }
}

interface OfferImageUploadProps {
  partnerId: string
  offerId: string
  // 'cover' = wide 16:9 drop area; 'tile' = square gallery tile.
  variant: 'cover' | 'tile'
  label: string
  disabled?: boolean
  onUploaded: (url: string) => void
}

export function OfferImageUpload({ partnerId, offerId, variant, label, disabled, onUploaded }: OfferImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    const result = await uploadOfferImage(partnerId, offerId, file)
    setUploading(false)
    if ('error' in result) setError(result.error)
    else onUploaded(result.url)
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" tabIndex={-1} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        aria-busy={uploading}
        className={cn(
          'w-full rounded-xl border-2 border-dashed border-[#1AC8ED]/40 bg-white/[0.03] text-[#1AC8ED]',
          'flex flex-col items-center justify-center gap-2 px-3 font-sans text-base font-medium',
          'hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'cover' ? 'aspect-video min-h-32' : 'aspect-square min-h-24'
        )}
      >
        {uploading ? (
          <>
            <span className="w-6 h-6 rounded-full border-2 border-[#1AC8ED]/30 border-t-[#1AC8ED] animate-spin" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <ImagePlus className="w-6 h-6" aria-hidden="true" />
            <span className="text-center">{label}</span>
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className={text.error}>
          {error}
        </p>
      ) : (
        variant === 'cover' && <p className={text.helper}>JPG, PNG or WebP, up to 5 MB.</p>
      )}
    </div>
  )
}
