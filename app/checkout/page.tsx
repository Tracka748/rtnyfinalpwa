'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'

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
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || 'Invalid checkout session'}</p>
          <Button onClick={() => router.back()} className="bg-[#59FFA0] hover:bg-[#4DE08A] text-[#121113]">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113] py-12 px-4">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#A0A0A0] transition-colors hover:text-[#59FFA0]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-[family-name:var(--font-rubik)]">Back</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="font-[family-name:var(--font-rokkitt)] text-3xl font-bold text-[#F9FDFF] mb-8">
          Checkout
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Order Summary */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-6 space-y-6">
            <h2 className="font-[family-name:var(--font-poppins)] text-xl text-[#F9FDFF]">
              Order Summary
            </h2>

            <div>
              <p className="text-sm text-[#A0A0A0] mb-2">Event</p>
              <p className="font-[family-name:var(--font-rokkitt)] text-lg text-[#F9FDFF]">
                {validationData.event.name}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#A0A0A0]">Tickets</p>
              {validationData.tickets.map((ticket, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="text-[#F9FDFF]">{ticket.name}</p>
                    <p className="text-sm text-[#A0A0A0]">
                      ${ticket.price.toFixed(2)} × {ticket.quantity}
                    </p>
                  </div>
                  <p className="font-[family-name:var(--font-playfair)] text-[#59FFA0]">
                    ${ticket.subtotal.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2A2A2A] pt-4">
              <div className="flex justify-between items-center">
                <span className="font-[family-name:var(--font-montserrat)] text-lg text-[#F9FDFF]">
                  Total
                </span>
                <span className="font-[family-name:var(--font-playfair)] text-2xl text-[#59FFA0]">
                  ${validationData.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Payment */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="font-[family-name:var(--font-poppins)] text-xl text-[#F9FDFF] mb-4">
                Payment Information
              </h2>
              <p className="text-[#A0A0A0] text-sm mb-6">
                Payment processing will be added in Phase 3.
                For now, clicking "Complete Purchase" will create your tickets.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="w-full bg-[#59FFA0] hover:bg-[#4DE08A] text-[#121113] font-[family-name:var(--font-montserrat)] py-6 text-lg"
                size="lg"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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