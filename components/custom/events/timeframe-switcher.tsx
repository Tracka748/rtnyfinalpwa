'use client'

export type TimeframeType = 'today' | 'tonight' | 'weekend' | '7days'

const TIMEFRAMES: { value: TimeframeType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tonight', label: 'Tonight' },
  { value: 'weekend', label: 'This Weekend' },
  { value: '7days', label: 'Next 7 Days' },
]

interface TimeframeSwitcherProps {
  active: TimeframeType
  onChange: (tf: TimeframeType) => void
}

export function TimeframeSwitcher({ active, onChange }: TimeframeSwitcherProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {TIMEFRAMES.map((tf) => (
        <button
          type="button"
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            active === tf.value
              ? 'bg-[#59FFA0] text-black'
              : 'bg-white/5 text-[#7DD8E8] border border-white/10 hover:bg-white/10'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
