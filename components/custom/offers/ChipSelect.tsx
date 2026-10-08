'use client'

import { cn } from '@/lib/utils'

interface ChipOption {
  value: string
  label: string
  disabled?: boolean
}

interface BaseProps {
  options: ChipOption[]
  label: string
  id?: string
  disabled?: boolean
}

interface SingleProps extends BaseProps {
  multiple?: false
  value: string | null
  // Tapping the selected chip again clears it.
  onChange: (value: string | null) => void
}

interface MultiProps extends BaseProps {
  multiple: true
  value: string[]
  max?: number
  onChange: (value: string[]) => void
}

export type ChipSelectProps = SingleProps | MultiProps

export function ChipSelect(props: ChipSelectProps) {
  const { options, label, id, disabled } = props

  const isSelected = (v: string) => (props.multiple ? props.value.includes(v) : props.value === v)

  const toggle = (v: string) => {
    if (props.multiple) {
      const has = props.value.includes(v)
      if (!has && props.max !== undefined && props.value.length >= props.max) return
      props.onChange(has ? props.value.filter((x) => x !== v) : [...props.value, v])
    } else {
      props.onChange(props.value === v ? null : v)
    }
  }

  return (
    <div id={id} role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = isSelected(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled || (opt.disabled && !selected)}
            onClick={() => toggle(opt.value)}
            className={cn(
              'min-h-12 px-5 rounded-full border text-sm font-sans font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed',
              selected
                ? 'bg-[#59FFA0]/20 border-[#59FFA0] text-[#59FFA0]'
                : 'border-white/20 text-[#7DD8E8] hover:border-white/40'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
