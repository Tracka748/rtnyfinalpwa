'use client'

// components/checkout/promo-code-section.tsx
// Reusable promo code input with validation and auto-apply

import { useState, useEffect } from 'react'
import { Check, X, Loader2, Tag, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface PromoCodeSectionProps {
  subtotal: number
  eventId?: string
  userId?: string
  onApply: (discount: PromoDiscount) => void
  onRemove: () => void
  initialCode?: string
  allowChange?: boolean
  autoApply?: boolean
}

export interface PromoDiscount {
  promoId: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmount: number
  message: string
}

export function PromoCodeSection({
  subtotal,
  eventId,
  userId,
  onApply,
  onRemove,
  initialCode = '',
  allowChange = true,
  autoApply = true
}: PromoCodeSectionProps) {
  const [code, setCode] = useState(initialCode)
  const [appliedPromo, setAppliedPromo] = useState<PromoDiscount | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasCheckedAutoApply, setHasCheckedAutoApply] = useState(false)

  // Auto-apply member discount on mount
  useEffect(() => {
    if (autoApply && !hasCheckedAutoApply && !appliedPromo && subtotal > 0) {
      checkAutoApplyPromos()
    }
  }, [autoApply, hasCheckedAutoApply, subtotal])

  // Check for auto-applicable promos
  const checkAutoApplyPromos = async () => {
    setHasCheckedAutoApply(true)
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/promo/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          subtotal
        })
      })

      const data = await response.json()

      if (data.autoApply && data.code) {
        const promo: PromoDiscount = {
          promoId: data.promoId,
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount,
          message: data.message
        }
        setAppliedPromo(promo)
        setCode(data.code)
        onApply(promo)
      }
    } catch (err) {
      console.error('Auto-apply error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Validate and apply promo code
  const validateCode = async () => {
    if (!code.trim()) {
      setError('Please enter a promo code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/v1/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          userId,
          eventId,
          subtotal
        })
      })

      const data = await response.json()

      if (data.valid) {
        const promo: PromoDiscount = {
          promoId: data.promoId,
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount,
          message: data.message
        }
        setAppliedPromo(promo)
        onApply(promo)
        setError('')
      } else {
        setError(data.message || 'Invalid promo code')
        setAppliedPromo(null)
      }
    } catch (err) {
      setError('Failed to validate promo code')
      console.error('Validation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove applied promo
  const removePromo = () => {
    setAppliedPromo(null)
    setCode('')
    setError('')
    setHasCheckedAutoApply(false)
    onRemove()
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardContent className="p-6">
        {/* Applied Promo Banner */}
        {appliedPromo && (
          <div className="bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#59FFA0]/20">
                  <Check className="h-5 w-5 text-[#59FFA0]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[#59FFA0] font-sans">
                      Promo Code Applied
                    </p>
                    <Badge className="bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90 font-label text-xs">
                      {appliedPromo.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#F9FDFF]/80 font-sans">
                    {appliedPromo.message}
                  </p>
                  <p className="text-lg font-bold text-[#59FFA0] mt-2 font-serif">
                    -${appliedPromo.discountAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              {allowChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removePromo}
                  className="text-[#F9FDFF]/60 hover:text-[#F9FDFF] hover:bg-[#2A2A2A]"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Promo Code Input */}
        {(!appliedPromo || allowChange) && (
          <div>
            <label className="flex items-center gap-2 text-sm text-[#F9FDFF]/60 mb-3 font-sans">
              <Tag className="h-4 w-4" />
              Have a promo code?
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && validateCode()}
                  placeholder="Enter code"
                  disabled={isLoading}
                  className="bg-[#121113] border-[#2A2A2A] text-[#F9FDFF] placeholder:text-[#F9FDFF]/40 font-sans"
                />
                {error && (
                  <p className="text-red-400 text-sm mt-2 font-sans">{error}</p>
                )}
              </div>
              <Button
                onClick={validateCode}
                disabled={isLoading || !code.trim()}
                className="bg-[#59FFA0] hover:bg-[#59FFA0]/90 text-[#121113] font-semibold px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Member Benefit Hint */}
        {!appliedPromo && !hasCheckedAutoApply && autoApply && (
          <div className="mt-4 p-3 rounded-lg bg-[#1AC8ED]/10 border border-[#1AC8ED]/30">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-[#1AC8ED] mt-0.5" />
              <p className="text-xs text-[#F9FDFF]/60 font-sans">
                <span className="text-[#1AC8ED] font-semibold">Members:</span> Your discount will be automatically applied
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}