'use client'

import { inputClass, priceFontClass } from './styles'

interface MoneyInputProps {
  id: string
  // Raw text so partial input like "12." survives; parse with parseMoney().
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hasError?: boolean
  describedById?: string
}

// Keeps digits and one decimal point, max two decimals.
export function sanitizeMoney(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole.slice(0, 9)
  return `${whole.slice(0, 9)}.${rest.join('').slice(0, 2)}`
}

export function parseMoney(value: string): number | null {
  if (value.trim() === '' || value === '.') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function MoneyInput({ id, value, onChange, placeholder = '0', hasError, describedById }: MoneyInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#59FFA0] ${priceFontClass}`}
      >
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(sanitizeMoney(e.target.value))}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={describedById}
        className={inputClass(hasError, `pl-9 text-lg font-bold ${priceFontClass}`)}
      />
    </div>
  )
}
