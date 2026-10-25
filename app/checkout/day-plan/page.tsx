'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { dayPlanCheckoutEnabled } from '@/lib/feature-flags'

const PLAN_STORAGE_KEY = 'rtny_pending_day_plan'

interface ConfirmStop {
  name: string
  category: string
  icon?: string
  time: string
  address: string
  estimatedSpend: number
  durationMinutes: number
  segment?: 'afternoon' | 'evening' | 'night'
}

interface PendingDayPlan {
  title: string
  date: string
  badge?: string
  stops: ConfirmStop[]
  totalSpend: number
  totalMins?: number
  preferences?: {
    groupType?: string
    transportation?: string
    energyType?: string
    tags?: string[]
    budget?: string
  }
  source: 'curated' | 'generated'
}

// ─── Boosters ─────────────────────────────────────────────────────────────────

const BOOSTERS = [
  { id: 'priority', name: 'Priority Reservations', description: 'Guaranteed tables at all stops', price: 12, icon: '🎟️' },
  { id: 'drinks',   name: 'Drink Credits',          description: '$15 credit per venue',           price: 15, icon: '🍹' },
  { id: 'photos',   name: 'Photo Package',           description: 'Professional night photos',      price: 20, icon: '📸' },
  { id: 'vip',      name: 'VIP Access',              description: 'Skip lines at nightlife stops',  price: 18, icon: '⭐' },
  { id: 'rideshare',name: 'Rideshare Credit',        description: '$10 Uber/Lyft credit',           price: 10, icon: '🚗' },
  { id: 'merch',    name: 'RTNY Merch',              description: 'Exclusive tee + tote bag',       price: 25, icon: '👕' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️', bar: '🍸', cafe: '☕', coffee: '☕',
  music: '🎵', art: '🎨', shopping: '🛍️', entertainment: '🎭',
  outdoor: '🌿', park: '🌿', fitness: '💪', spa: '🧘',
  lounge: '🛋️', club: '🎉', nightclub: '🎉', venue: '📍',
}

function getCategoryIcon(category: string, icon?: string): string {
  if (icon) return icon
  const lower = category.toLowerCase()
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return emoji
  }
  return '📍'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DayPlanCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  const [plan, setPlan] = useState<PendingDayPlan | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PLAN_STORAGE_KEY)
      if (raw) {
        setPlan(JSON.parse(raw))
      } else {
        router.push('/plan')
      }
    } catch {
      router.push('/plan')
    }
  }, [])

  useEffect(() => {
    if (canceled === 'true') {
      setPaymentError('Payment was canceled. You can try again below.')
    }
  }, [canceled])

  if (!dayPlanCheckoutEnabled()) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[#F9FDFF] font-sans text-base">Day plan checkout isn't available yet.</p>
          <button
            type="button"
            onClick={() => router.push('/plan')}
            className="px-5 py-2.5 rounded-xl border border-[#2a2829] text-[#7DD8E8] font-sans text-sm hover:border-[#59ffa0]/40 transition-colors"
          >
            Back to Plan My Day
          </button>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#59ffa0] border-t-transparent animate-spin" />
          <p className="text-[#7DD8E8] font-sans text-sm">Loading checkout…</p>
        </div>
      </div>
    )
  }

  const orderTotal = plan.totalSpend

  async function handlePay() {
    setProcessing(true)
    setPaymentError(null)
    try {
      const res = await fetch('/api/v1/stripe/create-day-plan-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTitle: plan.title,
          planDate:  plan.date,
          stops:     plan.stops,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong')
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121113] py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#7DD8E8] text-sm font-sans mb-5 hover:text-[#f9fdff] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Plan
          </button>
          <h1 className="font-header text-3xl md:text-4xl font-bold text-[#f9fdff] mb-1">Checkout</h1>
          <p className="text-[#7DD8E8] font-sans text-sm">
            {plan.title} · {formatDate(plan.date)}
          </p>
        </div>

        {/* Payment canceled notice */}
        {paymentError && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-sans text-sm">
            {paymentError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Itinerary */}
            <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#2a2829]">
                <span className="text-xl">🗓️</span>
                <h2 className="font-header text-lg font-bold text-[#f9fdff]">Your Itinerary</h2>
              </div>
              <div className="divide-y divide-[#2a2829]">
                {plan.stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl bg-[#59ffa0]/8 border border-[#59ffa0]/15 flex items-center justify-center text-base shrink-0">
                      {getCategoryIcon(stop.category, stop.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-header text-sm font-bold text-[#f9fdff] truncate">{stop.name}</p>
                      <p className="font-sans text-[11px] text-[#7DD8E8]/50 mt-0.5">{stop.time}{stop.address ? ` · ${stop.address}` : ''}</p>
                    </div>
                    <p className="font-slab-serif font-bold text-[#59ffa0] text-sm shrink-0">
                      ${stop.estimatedSpend}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Order summary ────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] sticky top-8 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2a2829]">
                <h2 className="font-header text-lg font-bold text-[#f9fdff]">Order Summary</h2>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Plan info */}
                <div className="pb-3 border-b border-[#2a2829]">
                  <p className="font-slab-serif font-bold text-[#f9fdff] text-sm mb-0.5">{plan.title}</p>
                  <p className="font-sans text-[11px] text-[#7DD8E8]/50">📅 {formatDate(plan.date)}</p>
                  <p className="font-sans text-[11px] text-[#7DD8E8]/50 mt-0.5">
                    {plan.stops.length} stop{plan.stops.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex justify-between font-sans text-sm">
                    <span className="text-[#7DD8E8]/60">Estimated spend</span>
                    <span className="text-[#f9fdff]">${plan.totalSpend}</span>
                  </div>
                  <div className="h-px bg-[#2a2829]" />
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-sans text-[#7DD8E8]/60 text-sm">Total</span>
                    <span className="font-slab-serif text-2xl font-bold text-[#59ffa0]">
                      ${orderTotal}
                    </span>
                  </div>
                </div>

                {/* Pay button */}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={processing}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-4 rounded-xl font-sans font-bold text-sm transition-all duration-200 mt-2',
                    processing
                      ? 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
                      : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20 active:scale-[0.98]'
                  )}
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#7DD8E8]/30 border-t-[#7DD8E8] animate-spin" />
                      Redirecting to Stripe…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      Pay with Card
                    </>
                  )}
                </button>

                {/* Security note */}
                <div className="flex items-center gap-2 pt-1">
                  <svg className="w-3.5 h-3.5 text-[#7DD8E8]/30 shrink-0" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L2 3v4c0 3 2.5 5 5 6 2.5-1 5-3 5-6V3L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <p className="font-sans text-[10px] text-[#7DD8E8]/30">Secure payment powered by Stripe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DayPlanCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121113] flex items-center justify-center text-white">
        Loading...
      </div>
    }>
      <DayPlanCheckoutContent />
    </Suspense>
  )
}
