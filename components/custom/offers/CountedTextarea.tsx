'use client'

import { cn } from '@/lib/utils'
import { inputClass, text } from './styles'

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
    <div className="space-y-1.5">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={[describedById, `${id}-count`].filter(Boolean).join(' ')}
        className={inputClass(hasError, 'resize-y leading-relaxed')}
      />
      <p
        id={`${id}-count`}
        aria-live="polite"
        className={cn(text.helper, 'text-right tabular-nums', nearLimit && 'text-[#FFB547]')}
      >
        {value.length}/{maxLength}
      </p>
    </div>
  )
}
