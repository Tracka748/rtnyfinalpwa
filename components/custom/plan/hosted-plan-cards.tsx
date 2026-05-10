"use client"

import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface PlanCard {
  id: string
  title: string
  hostName: string
  hostAvatar: string
  coverImage: string
  venues: string[]
  price: string
}

const plans: PlanCard[] = [
  {
    id: "1",
    title: "DJ Kraves Friday Night",
    hostName: "DJ Kraves",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=djkraves",
    coverImage: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_36_29%20AM.png",
    venues: ["Drinks", "Wings", "DJ Session"],
    price: "Free",
  },
  {
    id: "2",
    title: "Racqui B's Shopping Therapy",
    hostName: "Racqui B",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=racquib",
    coverImage: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_36_16%20AM.png",
    venues: ["Makeup", "Perfume", "Hygiene"],
    price: "$15",
  },
  {
    id: "3",
    title: "The Sunday Funday",
    hostName: "Coach Dre",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=coachdre",
    coverImage: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_35_56%20AM.png",
    venues: ["Highland Park", "Strong Museum", "Abbott's"],
    price: "Free",
  },
]

function PriceReflection({ price }: { price: string }) {
  return (
    <div className="relative pb-4">
      <span className="font-serif text-2xl italic text-[#F9FDFF]">{price}</span>
      <div
        className="absolute top-full left-0 overflow-hidden"
        style={{ height: "16px" }}
      >
        <span
          className="font-serif text-2xl italic text-[#F9FDFF]/40"
          style={{
            display: "block",
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)",
          }}
        >
          {price}
        </span>
      </div>
    </div>
  )
}

function PlanCard({ plan }: { plan: PlanCard }) {
  const router = useRouter()

  return (
    <div className="flex-shrink-0 w-[260px] flex flex-col gap-3">

      {/* Card — pure poster, regular img tag only */}
      <div
        className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-white/[0.06] cursor-pointer group"
        onClick={() => router.push(`/plan?hosted=${plan.id}&mode=day`)}
      >
        <img
          src={plan.coverImage}
          alt={plan.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Light vignette only */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Hosted By pill */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="font-label text-[9px] uppercase tracking-wider text-white/70">
              Hosted by
            </span>
            <img
              src={plan.hostAvatar}
              alt={plan.hostName}
              className="w-4 h-4 rounded-full border border-white/20"
            />
            <span className="font-label text-[11px] font-medium text-white/90">
              {plan.hostName}
            </span>
          </div>
        </div>

        {/* Title at bottom of card */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-slab-serif text-xl font-bold text-[#F9FDFF] leading-tight">
            {plan.title}
          </h3>
        </div>
      </div>

      {/* Price with glossy reflection */}
      <PriceReflection price={plan.price} />

      {/* CTA button */}
      <button
        onClick={() => router.push(`/plan?hosted=${plan.id}&mode=day`)}
        className="w-full flex items-center justify-center gap-2 bg-[#59FFA0] text-[#121113] font-label font-semibold text-sm py-3 rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Build This Plan
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export function HostedPlanCards() {
  return (
    <section className="w-full py-8">
      <div className="flex items-center justify-between px-4 mb-5">
        <h2 className="font-slab-serif text-2xl font-bold text-[#F9FDFF] flex items-center gap-2">
          <span>🗓</span>
          <span>Plan Your Day</span>
        </h2>
        <button className="font-label text-sm font-medium text-[#59FFA0] flex items-center gap-1 hover:underline">
          See All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div
        className="flex gap-4 overflow-x-auto px-4 pb-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  )
}
