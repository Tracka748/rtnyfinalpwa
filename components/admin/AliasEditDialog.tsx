'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { CONTROL_BORDER, FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'
import { validateAlias } from '@/lib/alias-validation'
import { NETWORK_ERROR, aliasSaveError, parseSavedAlias } from '@/lib/admin-alias-ui'

interface Props {
  userId: string
  userName: string
  currentAlias: string | null
  onClose: () => void
  onSaved: (userId: string, alias: string) => void
}

const BTN = `${TAP} flex-1 px-4 rounded-lg ${SECONDARY} font-sans font-medium touch-manipulation ${FOCUS_RING}`

// Rendered once at page level. Enter saves, Escape cancels.
export function AliasEditDialog({ userId, userName, currentAlias, onClose, onSaved }: Props) {
  const titleId = useId()
  const errorId = useId()
  const [value, setValue] = useState(currentAlias ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    const v = validateAlias(value)
    if (!v.ok) { setError(v.error); return }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/alias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: v.alias }),
      })
      let body: unknown = null
      try { body = await res.json() } catch { body = null }
      const saved = res.ok ? parseSavedAlias(body) : null
      if (saved) {
        onSaved(userId, saved)
        onClose()
        toast.success('Alias saved')
        return
      }
      setError(aliasSaveError(res.ok ? 500 : res.status, body))
    } catch {
      setError(NETWORK_ERROR)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={() => { if (!saving) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-[#0E0E10] border border-white/15 rounded-xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape' && !saving) onClose() }}
      >
        <h3 id={titleId} className="text-white font-slab-serif font-bold text-lg break-words">
          Alias for {userName}
        </h3>
        <div className="space-y-2">
          <div className={`flex items-center rounded-lg bg-white/5 border ${CONTROL_BORDER} focus-within:border-[#59FFA0]`}>
            <span aria-hidden="true" className="pl-3 text-[#7DD8E8] text-base">@</span>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}
              aria-label="Alias"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={31}
              className="w-full min-h-[44px] px-1 pr-3 bg-transparent text-[#F9FDFF] text-base font-sans focus:outline-none"
            />
          </div>
          <p className={`${SECONDARY} text-[#7DD8E8]`}>Letters, numbers and underscores, 3 to 30 characters.</p>
          {error && (
            <p id={errorId} role="alert" className={`${SECONDARY} text-red-400`}>{error}</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`${BTN} border ${CONTROL_BORDER} text-[#7DD8E8] hover:bg-white/5 disabled:opacity-40`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={`${BTN} bg-[#59FFA0]/20 border border-[#59FFA0]/40 text-[#59FFA0] hover:bg-[#59FFA0]/30 disabled:opacity-60`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
