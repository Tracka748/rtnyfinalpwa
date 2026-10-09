'use client'

import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/10 border-white/20 text-white/70' },
  pending: { label: 'In review', className: 'bg-[#FFB547]/10 border-[#FFB547]/30 text-[#FFB547]' },
  active: { label: 'Live', className: 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0]' },
  needs_changes: { label: 'Needs changes', className: 'bg-red-500/10 border-red-500/30 text-red-400' },
}

export function OfferStatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? { label: status, className: 'bg-white/10 border-white/20 text-white/70' }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold font-sans whitespace-nowrap shrink-0',
        style.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  )
}
