import { cn } from '@/lib/utils'

// Dark input style shared with app/profile/partner/edit/page.tsx, sized for touch
// (min 48px tall, 16px text so iOS doesn't zoom on focus).
export function inputClass(hasError?: boolean, extra?: string) {
  return cn(
    'w-full min-h-12 bg-white/5 border rounded-lg px-4 py-3 text-base text-white font-sans',
    'placeholder:text-white/30 focus:outline-none transition-colors',
    hasError ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-[#59FFA0]/50',
    extra
  )
}

export const cardClass = 'bg-[#1a1a1a] border border-white/10 rounded-2xl'

export const priceFontClass = 'font-[family-name:var(--font-playfair)]'
