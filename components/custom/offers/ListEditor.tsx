'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { inputClass, text } from './styles'

interface ListEditorProps {
  id: string
  items: string[]
  onChange: (items: string[]) => void
  max: number
  maxItemLength: number
  placeholder?: string
  addLabel?: string
  hasError?: boolean
  describedById?: string
}

export function ListEditor({
  id,
  items,
  onChange,
  max,
  maxItemLength,
  placeholder,
  addLabel = 'Add',
  hasError,
  describedById,
}: ListEditorProps) {
  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()
  const full = items.length >= max
  const duplicate = items.some((i) => i.toLowerCase() === trimmed.toLowerCase())
  const canAdd = trimmed.length > 0 && !full && !duplicate

  const add = () => {
    if (!canAdd) return
    onChange([...items, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg pl-4"
            >
              <span className="flex-1 min-w-0 py-3 text-base text-white font-sans break-words">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${item}`}
                className="w-12 h-12 shrink-0 flex items-center justify-center text-white/60 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div className="flex gap-2">
          <input
            id={id}
            type="text"
            value={draft}
            maxLength={maxItemLength}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder={placeholder}
            aria-invalid={hasError || undefined}
            aria-describedby={describedById}
            className={inputClass(hasError, 'flex-1 min-w-0')}
          />
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="min-h-12 px-4 shrink-0 rounded-lg border border-[#1AC8ED]/40 text-[#1AC8ED] text-base font-sans font-medium inline-flex items-center gap-1.5 hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        </div>
      )}

      <p className={`${text.helper} tabular-nums`}>
        {items.length}/{max}
        {duplicate && trimmed && ' · Already added'}
        {full && ' · List is full'}
      </p>
    </div>
  )
}
