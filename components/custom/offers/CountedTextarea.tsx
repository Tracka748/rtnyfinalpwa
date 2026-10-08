'use client'

import { cn } from '@/lib/utils'
import { inputClass } from './styles'

interface CountedTextareaProps {
  id: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  rows?: number
  placeholder?: string
  hasError?: boolean
  describedById?: string
}

export function CountedTextarea({
  id,
  value,
  onChange,
  maxLength,
  rows = 4,
  placeholder,
  hasError,
  describedById,
}: CountedTextareaProps) {
  const remaining = maxLength - value.length
  const nearLimit = remaining <= Math.max(20, Math.round(maxLength * 0.1))

  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={[describedById, `${id}-count`].filter(Boolean).join(' ')}
        className={inputClass(hasError, 'resize-y pb-7 leading-relaxed')}
      />
      <span
        id={`${id}-count`}
        aria-live="polite"
        className={cn(
          'absolute right-3 bottom-2 text-xs font-sans tabular-nums pointer-events-none',
          nearLimit ? 'text-[#FFB547]' : 'text-white/40'
        )}
      >
        {value.length}/{maxLength}
      </span>
    </div>
  )
}
