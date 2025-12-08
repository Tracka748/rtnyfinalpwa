'use client'

// app/checkout/page.tsx
// Complete checkout page with promo codes, boosters, and payment

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ShoppingCart, 
  Calendar, 
  MapPin,
  Ticket,
  CreditCard,
  Lock,
  ArrowLeft,
  Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PromoCodeSection, PromoDiscount } from '@/components/checkout/promo-code-section'

interface CartItem {
  ticketTypeId: string
  quantity: number
  price: number
  name: string
}

interface CheckoutData {
  eventId: string
  eventName: string
  eventDate: string
  items: CartItem[]
  subtotal: number
}

// Sample boosters - Replace with real data from perks table
const availableBoosters = [
  { id: '1', name: 'VIP Entry', description: 'Skip the line', price: 10, icon: '🎟️' },
  { id: '2', name: 'Free Drink', description: 'One complimentary drink', price: 8, icon: '🍹' },
  { id: '3', name: 'Photo Package', description: 'Professional photos', price: 15, icon: '📸' },
  { id: '4', name: 'Coat Check', description: 'Secure coat storage', price: 5, icon: '🧥' },
  { id: '5', name: 'VIP Parking', description: 'Reserved parking spot', price: 12, icon: '🅿️' },
  { id: '6', name: 'Meet & Greet', description: 'Meet the performers', price: 25, icon: '🤝' },
  { id: '7', name: 'Early Entry', description: '1 hour early access', price: 15, icon: '⏰' },
  { id: '8', name: 'Merch Bundle', description: 'Event merchandise', price: 20, icon: '👕' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [selectedBoosters, setSelectedBoosters] = useState<Set<string>>(new Set())
  const [appliedPromo, setAppliedPromo] = useState<PromoDiscount | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load cart data on mount
  useEffect(() => {
    const savedCart = sessionStorage.getItem('checkout_cart')
    if (savedCart) {
      setCheckoutData(JSON.parse(savedCart))
    } else {
      // No cart data, redirect back to events
      router.push('/events')
    }
  }, [])

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59FFA0] mx-auto mb-4"></div>
          <p className="text-[#F9FDFF]/60 font-sans">Loading checkout...</p>
        </div>
      </div>
    )
  }

  // Toggle booster selection
  const toggleBooster = (boosterId: string) => {
    setSelectedBoosters(prev => {
      const next = new Set(prev)
      if (next.has(boosterId)) {
        next.delete(boosterId)
      } else {
        next.add(boosterId)
      }
      return next
    })
  }

  // Calculate totals
  const ticketsSubtotal = checkoutData.subtotal
  const boostersSubtotal = Array.from(selectedBoosters).reduce((sum, id) => {
    const booster = availableBoosters.find(b => b.id === id)
    return sum + (booster?.price || 0)
  }, 0)
  const orderSubtotal = ticketsSubtotal + boostersSubtotal
  const discountAmount = appliedPromo?.discountAmount || 0
  const taxAmount = 0 // Add tax calculation if needed
  const totalAmount = orderSubtotal - discountAmount + taxAmount

  // Handle promo code application
  const handlePromoApply = (promo: PromoDiscount) => {
    setAppliedPromo(promo)
  }

  const handlePromoRemove = () => {
    setAppliedPromo(null)
  }

  // Process payment
  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      // Prepare the purchase request
      const purchaseData = {
        eventId: checkoutData.eventId,
        tickets: checkoutData.items.map(item => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          price: item.price
        })),
        promoCode: appliedPromo?.code || null,
        totalAmount: totalAmount
      }

      console.log('🛒 Submitting purchase:', purchaseData)

      // Call the ticket purchase API
      const response = await fetch('/api/v1/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData)
      })

      const result = await response.json()
      console.log('📦 Purchase API response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete purchase')
      }

      // Save order details to sessionStorage for confirmation page
      const completedOrder = {
        orderId: result.data.tickets?.[0]?.id || 'N/A',
        eventName: checkoutData.eventName,
        eventDate: checkoutData.eventDate,
        ticketCount: result.data.ticketCount,
        totalAmount: totalAmount,
        tickets: result.data.tickets,
        purchaseDate: new Date().toISOString()
      }

      sessionStorage.setItem('completed_order', JSON.stringify(completedOrder))

      // Clear cart
      sessionStorage.removeItem('checkout_cart')

      // Redirect to confirmation page
      const orderId = result.data.tickets?.[0]?.id || 'unknown'
      router.push(`/confirmation?orderId=${orderId}&success=true`)

      console.log('✅ Purchase completed successfully')

    } catch (error) {
      console.error('❌ Payment error:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete purchase. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121113] py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-[#F9FDFF]/60 hover:text-[#F9FDFF] hover:bg-[#1A1A1A] mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          <h1 className="font-header text-4xl md:text-5xl font-bold text-[#F9FDFF] mb-2">
            Checkout
          </h1>
          <p className="font-sans text-[#F9FDFF]/60">
            Complete your order for {checkoutData.eventName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tickets Summary */}
            <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-[#59FFA0]" />
                  <CardTitle className="font-header text-2xl text-[#F9FDFF]">
                    Your Tickets
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {checkoutData.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#121113] rounded-lg border border-[#2A2A2A]">
                    <div>
                      <p className="font-sans font-semibold text-[#F9FDFF]">{item.name}</p>
                      <p className="font-sans text-sm text-[#F9FDFF]/60">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-serif text-xl font-bold text-[#59FFA0]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Boosters/Add-ons */}
            <Card className="bg-gradient-to-br from-[#59FFA0]/5 via-[#1AC8ED]/5 to-transparent border-2 border-[#59FFA0]/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-header text-2xl text-[#F9FDFF] mb-1">
                      🎁 Enhance Your Experience
                    </CardTitle>
                    <CardDescription className="font-sans text-[#F9FDFF]/60">
                      Add boosters to make your night unforgettable
                    </CardDescription>
                  </div>
                  {selectedBoosters.size > 0 && (
                    <Badge className="bg-[#59FFA0] text-[#121113] font-label">
                      {selectedBoosters.size} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableBoosters.map((booster) => {
                    const isSelected = selectedBoosters.has(booster.id)
                    return (
                      <button
                        key={booster.id}
                        onClick={() => toggleBooster(booster.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-[#59FFA0] bg-[#59FFA0]/10 shadow-lg shadow-[#59FFA0]/20'
                            : 'border-[#2A2A2A] bg-[#121113] hover:border-[#59FFA0]/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-[#59FFA0]">
                            <Check className="h-3 w-3 text-[#121113]" />
                          </div>
                        )}
                        <div className="text-3xl mb-2">{booster.icon}</div>
                        <p className="font-sans font-semibold text-sm text-[#F9FDFF] mb-1">
                          {booster.name}
                        </p>
                        <p className="font-sans text-xs text-[#F9FDFF]/60 mb-2">
                          {booster.description}
                        </p>
                        <p className="font-serif font-bold text-[#59FFA0]">
                          +${booster.price}
                        </p>
                      </button>
                    )
                  })}
                </div>
                
                {selectedBoosters.size > 0 && (
                  <div className="mt-4 p-3 bg-[#121113] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-sm text-[#F9FDFF]/60">
                        Boosters total
                      </p>
                      <p className="font-serif text-lg font-bold text-[#59FFA0]">
                        +${boostersSubtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promo Code */}
            <PromoCodeSection
              subtotal={orderSubtotal}
              eventId={checkoutData.eventId}
              onApply={handlePromoApply}
              onRemove={handlePromoRemove}
              allowChange={true}
              autoApply={true}
            />
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:col-span-1">
            <Card className="bg-[#1A1A1A] border-[#2A2A2A] sticky top-8">
              <CardHeader>
                <CardTitle className="font-header text-xl text-[#F9FDFF]">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Info */}
                <div className="pb-4 border-b border-[#2A2A2A]">
                  <p className="font-slab-serif text-lg font-bold text-[#F9FDFF] mb-2">
                    {checkoutData.eventName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-[#F9FDFF]/60">
                    <Calendar className="h-4 w-4" />
                    <span className="font-sans">
                      {new Date(checkoutData.eventDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between font-sans text-sm">
                    <span className="text-[#F9FDFF]/60">Tickets</span>
                    <span className="text-[#F9FDFF]">${ticketsSubtotal.toFixed(2)}</span>
                  </div>
                  
                  {boostersSubtotal > 0 && (
                    <div className="flex justify-between font-sans text-sm">
                      <span className="text-[#F9FDFF]/60">Boosters ({selectedBoosters.size})</span>
                      <span className="text-[#F9FDFF]">${boostersSubtotal.toFixed(2)}</span>
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="flex justify-between font-sans text-sm">
                      <span className="text-[#59FFA0]">
                        Discount ({appliedPromo.code})
                      </span>
                      <span className="text-[#59FFA0]">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="h-px bg-[#2A2A2A]" />

                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="font-sans text-[#F9FDFF]/60">Total</span>
                    <span className="font-serif text-3xl font-bold text-[#59FFA0]">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Button */}
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-[#59FFA0] hover:bg-[#59FFA0]/90 text-[#121113] font-semibold text-lg py-6 rounded-xl"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#121113] mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      Complete Payment
                    </>
                  )}
                </Button>

                {/* Security Notice */}
                <div className="pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-[#F9FDFF]/40 mt-0.5" />
                    <p className="text-xs text-[#F9FDFF]/40 font-sans">
                      Secure checkout powered by industry-standard encryption
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}