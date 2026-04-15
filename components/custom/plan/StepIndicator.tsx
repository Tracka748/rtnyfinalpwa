'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { number: 1, label: 'Event Details' },
  { number: 2, label: 'Browse Vendors' },
  { number: 3, label: 'Review & Submit' },
]

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-md mx-auto">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.number
        const isActive = currentStep === step.number
        const isLast = i === STEPS.length - 1

        return (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isCompleted && 'bg-[#59ffa0] text-[#121113]',
                  isActive && 'bg-[#59ffa0]/20 border-2 border-[#59ffa0] text-[#59ffa0]',
                  !isCompleted && !isActive && 'bg-[#242324] border border-[#2a2829] text-[#7DD8E8]'
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-label tracking-wide whitespace-nowrap transition-colors duration-300',
                  isActive ? 'text-[#59ffa0]' : isCompleted ? 'text-[#f9fdff]/60' : 'text-[#7DD8E8]/50'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 h-px mx-2 mb-5 transition-colors duration-300"
                style={{
                  background: isCompleted
                    ? 'linear-gradient(90deg, #59ffa0, #1ac8ed)'
                    : '#2a2829'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
