'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

const MAX_BYTES = 5 * 1024 * 1024

const KIND_CONFIG = {
  logo: { bucket: 'partner-logos', filename: 'logo', label: 'Logo' },
  cover: { bucket: 'partner-covers', filename: 'cover', label: 'Cover Image' },
} as const

interface Props {
  kind: keyof typeof KIND_CONFIG
  partnerId: string | null | undefined
  value: string
  onChange: (url: string) => void
}

function extensionFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : ''
  const fromType = file.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg')
  return (fromName || fromType || 'png').toLowerCase()
}

export default function PartnerImageUpload({ kind, partnerId, value, onChange }: Props) {
  const { bucket, filename, label } = KIND_CONFIG[kind]
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    setError(null)

    if (!partnerId) {
      setError('Partner not loaded yet — try again in a moment.')
      input.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      input.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — max is 5MB.`)
      input.value = ''
      return
    }

    setUploading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const path = `${partnerId}/${filename}.${extensionFor(file)}`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(`${data.publicUrl}?v=${Date.now()}`)
    } catch (err) {
      console.error(`[PartnerImageUpload] ${bucket} upload failed:`, err)
      setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
        {label}
      </label>
      {value && (
        <img
          src={value}
          alt={`Current ${label.toLowerCase()}`}
          className={
            kind === 'logo'
              ? 'w-20 h-20 rounded-lg object-cover border border-white/10 bg-white/5'
              : 'w-full h-32 rounded-lg object-cover border border-white/10 bg-white/5'
          }
        />
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={uploading}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#59FFA0]/15 file:px-3 file:py-1 file:text-[#59FFA0] file:text-xs disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
      />
      {uploading && <p className="text-xs text-white/60">Uploading…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
