'use client'

import { inputClass } from './styles'

interface NumberInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  // 'integer' → numeric keypad, digits only. 'decimal' → allows one decimal point.
  kind?: 'integer' | 'decimal'
  suffix?: string
  placeholder?: string
  hasError?: boolean
  describedById?: string
}

function sanitize(raw: string, kind: 'integer' | 'decimal') {
  if (kind === 'integer') return raw.replace(/\D/g, '').slice(0, 6)
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  return rest.length === 0 ? whole.slice(0, 6) : `${whole.slice(0, 6)}.${rest.join('').slice(0, 2)}`
}

export function NumberInput({
  id,
  value,
  onChange,
  kind = 'integer',
  suffix,
  placeholder,
  hasError,
  describedById,
}: NumberInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode={kind === 'integer' ? 'numeric' : 'decimal'}
        pattern={kind === 'integer' ? '[0-9]*' : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value, kind))}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={describedById}
        className={inputClass(hasError, suffix ? 'pr-16' : undefined)}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-sans pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}
