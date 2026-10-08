'use client'

import { cn } from '@/lib/utils'

interface StepProgressProps {
  steps: string[]
  // 1-based, like StepIndicator in Plan My Event.
  current: number
}

export function StepProgress({ steps, current }: StepProgressProps) {
  const total = steps.length
  const index = Math.min(Math.max(current, 1), total)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 font-sans">
        <span className="text-sm font-semibold text-white truncate">{steps[index - 1]}</span>
        <span className="text-xs text-[#7DD8E8] shrink-0">
          Step {index} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-valuetext={`Step ${index} of ${total}: ${steps[index - 1]}`}
        className="flex gap-1.5"
      >
        {steps.map((label, i) => (
          <div
            key={label}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i < index ? 'bg-[#59FFA0]' : 'bg-white/10'
            )}
          />
        ))}
      </div>
    </div>
  )
}
