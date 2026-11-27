'use client'

import { useEffect, useId, useState } from 'react'
import { BODY, CARD_BORDER, CONTROL_BORDER, FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'
import { validateCreatePackage } from '@/lib/package-validation'
import {
  KEY_WARNING, NETWORK_ERROR, createPackageError, parseThemes, type ThemeOption,
} from '@/lib/admin-package-ui'

interface Props {
  onCreated: () => void
  onCancel: () => void
}

const FIELD = `${TAP} w-full rounded-md border ${CONTROL_BORDER} bg-[#121113] px-3 ${BODY} text-white placeholder:text-white/50 ${FOCUS_RING}`
const BTN = `${TAP} touch-manipulation rounded-lg px-4 ${BODY} font-medium ${FOCUS_RING}`

// Creates a package and its first draft. Only active themes are offered, and the server checks that again.
export function NewPackageForm({ onCreated, onCancel }: Props) {
  const ids = { key: useId(), occasion: useId(), title: useId(), theme: useId(), warn: useId(), err: useId() }
  const [key, setKey] = useState('')
  const [occasion, setOccasion] = useState('')
  const [title, setTitle] = useState('')
  const [themeId, setThemeId] = useState('')
  const [themes, setThemes] = useState<ThemeOption[]>([])
  const [themesFailed, setThemesFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/v1/themes', { signal: ctrl.signal })
        const list = res.ok ? parseThemes(await res.json().catch(() => null)) : null
        if (ctrl.signal.aborted) return
        if (list) setThemes(list)
        else setThemesFailed(true)
      } catch {
        if (!ctrl.signal.aborted) setThemesFailed(true)
      }
    })()
    return () => ctrl.abort()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const body = { key: key.trim(), occasion, title, ...(themeId ? { theme_id: themeId } : {}) }
    const v = validateCreatePackage(body)
    if (!v.ok) { setError(v.error); return }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/v1/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.value.theme_id ? v.value : { key: v.value.key, occasion: v.value.occasion, title: v.value.title }),
      })
      if (res.ok) { onCreated(); return }
      setError(createPackageError(res.status, await res.json().catch(() => null)))
    } catch {
      setError(NETWORK_ERROR)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className={`space-y-4 rounded-xl border ${CARD_BORDER} bg-[#1a1a1a] p-4 sm:p-6`} aria-label="New package">
      <h2 className="text-xl font-semibold text-white">New package</h2>

      <div className="space-y-2">
        <label htmlFor={ids.key} className={`block ${BODY} font-medium text-white`}>Key</label>
        <input
          id={ids.key} value={key} onChange={e => { setKey(e.target.value); setError(null) }}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={64} required
          aria-describedby={ids.warn} className={FIELD} placeholder="birthday_brunch"
        />
        <p id={ids.warn} className={`${SECONDARY} max-w-prose break-words text-yellow-300`}>
          <span className="font-semibold">Warning: </span>{KEY_WARNING}
        </p>
        <p className={`${SECONDARY} break-all text-[#7DD8E8]`}>Page address: /packages/{key.trim() || '<key>'}</p>
        <p className={`${SECONDARY} text-[#7DD8E8]`}>Lowercase letters, numbers and underscores. Must start with a letter.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={ids.occasion} className={`block ${BODY} font-medium text-white`}>Occasion</label>
        <input id={ids.occasion} value={occasion} onChange={e => { setOccasion(e.target.value); setError(null) }} maxLength={60} required className={FIELD} placeholder="Birthday" />
      </div>

      <div className="space-y-2">
        <label htmlFor={ids.title} className={`block ${BODY} font-medium text-white`}>Title</label>
        <input id={ids.title} value={title} onChange={e => { setTitle(e.target.value); setError(null) }} maxLength={120} required className={FIELD} />
      </div>

      <div className="space-y-2">
        <label htmlFor={ids.theme} className={`block ${BODY} font-medium text-white`}>Theme (optional)</label>
        <select id={ids.theme} value={themeId} onChange={e => setThemeId(e.target.value)} className={FIELD}>
          <option value="">No theme</option>
          {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {themesFailed && <p className={`${SECONDARY} text-[#7DD8E8]`}>Themes could not be loaded. You can create the package without one.</p>}
      </div>

      <div aria-live="polite">
        {error && <p id={ids.err} role="alert" className={`${SECONDARY} break-words text-red-300`}>{error}</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={`${BTN} bg-[#59FFA0] text-[#121113] disabled:opacity-60`}>
          {saving ? 'Creating…' : 'Create package'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={`${BTN} border ${CONTROL_BORDER} text-white hover:bg-white/10 disabled:opacity-60`}>
          Cancel
        </button>
      </div>
    </form>
  )
}
