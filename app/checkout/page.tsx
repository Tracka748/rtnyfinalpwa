'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppNav } from '@/components/custom/layout/app-nav'

interface TicketItem {
  ticketTypeId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface ValidationData {
  event: {
    id: string
    name: string
  }
  tickets: TicketItem[]
  totalAmount: number
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateTickets()
  }, [])

  async function validateTickets() {
    try {
      const eventId = searchParams.get('eventId')
      const ticketsParam = searchParams.get('tickets')

      if (!eventId || !ticketsParam) {
        setError('Invalid checkout parameters')
        setIsLoading(false)
        return
      }

      const tickets = JSON.parse(ticketsParam)

      const response = await fetch('/api/v1/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, tickets })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setValidationData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate tickets')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePurchase() {
    if (!validationData) return

    setIsPurchasing(true)
    setError(null)

    try {
      const eventId = searchParams.get('eventId')
      const ticketsParam = searchParams.get('tickets')
      const tickets = JSON.parse(ticketsParam!)

      const response = await fetch('/api/v1/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, tickets })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      // Redirect to success page
      router.push(`/checkout/success?ticketCount=${data.data.ticketCount}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete purchase')
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#59FFA0]" />
      </div>
    )
  }

  if (error || !validationData) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 font-[family-name:var(--font-rubik)]">
            {error || 'Invalid checkout session'}
          </p>
          <Button 
            onClick={() => router.back()} 
            className="bg-[#59FFA0] hover:bg-[#4DE08A] text-[#121113] font-[family-name:var(--font-rubik)]"
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113] text-[#F9FDFF]">
      <AppNav showBack onBack={() => router.back()} />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-[family-name:var(--font-rokkitt)]">
            Checkout
          </h1>
          <p className="text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
            Review your order and complete your purchase
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Order Summary */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A] space-y-6">
              <h2 className="text-xl font-semibold font-[family-name:var(--font-playfair)]">
                Order Summary
              </h2>

              {/* Event Name */}
              <div>
                <p className="text-sm text-[#F9FDFF]/60 mb-2 font-[family-name:var(--font-rubik)]">
                  Event
                </p>
                <p className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rokkitt)]">
                  {validationData.event.name}
                </p>
              </div>

              {/* Tickets */}
              <div className="space-y-4">
                <p className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
                  Tickets
                </p>
                {validationData.tickets.map((ticket, index) => (
                  <div key={index} className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
                        {ticket.name}
                      </p>
                      <p className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
                        ${ticket.price.toFixed(2)} × {ticket.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
                      ${ticket.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
                    ${validationData.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A] space-y-6">
              <h2 className="text-xl font-semibold font-[family-name:var(--font-playfair)]">
                Payment
              </h2>
              
              <div className="p-4 rounded-lg bg-[#59FFA0]/10 border border-[#59FFA0]/30">
                <p className="text-sm text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)]">
                  💳 Payment processing will be added in Phase 3.
                  For now, clicking "Complete Purchase" will create your tickets.
                </p>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400 text-sm font-[family-name:var(--font-rubik)]">
                  {error}
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing}
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
                {isPurchasing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Purchase'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#59FFA0]" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}