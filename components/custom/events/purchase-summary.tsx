// components/custom/events/purchase-summary.tsx
"use client"

import { Button } from "@/components/ui/button"

interface PurchaseSummaryProps {
  totalQuantity: number
  totalPrice: number
  onPurchase: () => void
  disabled?: boolean
}

export function PurchaseSummary({
  totalQuantity,
  totalPrice,
  onPurchase,
  disabled = false,
}: PurchaseSummaryProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#121113] via-[#121113]/95 to-transparent backdrop-blur-xl" />
      
      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-6 py-6 space-y-4">
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)]">
            Total ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"})
          </span>
          <span className="text-3xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)] tabular-nums">
            ${totalPrice.toFixed(2)}
          </span>
        </div>

        {/* Purchase Button */}
        <Button
          onClick={onPurchase}
          disabled={disabled || totalQuantity === 0}
          className="
            w-full h-14 text-lg font-semibold rounded-xl 
            bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] 
            hover:from-[#4DE690] hover:to-[#0AB8DD] 
            active:scale-95
            text-[#121113] 
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all duration-300 
            font-[family-name:var(--font-rubik)]
            shadow-lg shadow-[#59FFA0]/20 hover:shadow-xl hover:shadow-[#59FFA0]/30
          "
        >
          {totalQuantity === 0 ? "Select Tickets" : "Purchase Tickets"}
        </Button>
      </div>
    </div>
  )
}