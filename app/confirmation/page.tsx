'use client'

// app/confirmation/page.tsx
// Order confirmation page after successful purchase

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Ticket,
  Calendar,
  MapPin,
  Mail,
  Download,
  Share2,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OrderData {
  orderId: string
  confirmationCode: string
  eventName: string
  eventDate: string
  venueName: string
  venueAddress: string
  tickets: Array<{ type: string; quantity: number; price: number; qrCodeData?: string[] }>
  boosters: Array<{ name: string; price: number }>
  total: number
  email: string
}

function ConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [showConfetti, setShowConfetti] = useState(false)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentReceived, setPaymentReceived] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.push('/events')
      return
    }

    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)

    let pollInterval: ReturnType<typeof setInterval> | null = null
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null
    let cleanupTimeout: ReturnType<typeof setTimeout> | null = null
    let resolved = false

    function applyOrder(data: any) {
      if (resolved) return
      resolved = true
      if (pollInterval) clearInterval(pollInterval)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      if (cleanupTimeout) clearTimeout(cleanupTimeout)

      const tickets = data.tickets || []
      const groupedTickets = tickets.reduce((acc: any[], ticket: any) => {
        const existing = acc.find((t: any) => t.type === ticket.ticket_type)
        if (existing) {
          existing.quantity += 1
          existing.qrCodeData?.push(ticket.qr_code_data)
        } else {
          acc.push({
            type: ticket.ticket_type,
            quantity: 1,
            price: ticket.base_price,
            qrCodeData: [ticket.qr_code_data],
          })
        }
        return acc
      }, [])

      setOrderData({
        orderId: data.id,
        confirmationCode: data.id,
        eventName: data.events?.name || 'Event',
        eventDate: data.events?.event_date || new Date().toISOString(),
        venueName: data.events?.venues?.name || 'Venue TBA',
        venueAddress: data.events?.venues?.address || 'Address TBA',
        tickets: groupedTickets,
        boosters: [],
        total: data.total_amount,
        email: data.customer_email || '',
      })
      setIsLoading(false)
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/v1/orders/by-session/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          applyOrder(data)
        }
        // 404 = order not yet created, keep polling
        // 401/403 = auth not ready yet, keep polling
      } catch {
        // network error, keep polling
      }
    }

    async function init() {
      await fetchOrder()
      if (resolved) return

      // Poll every 5 s until the order appears
      pollInterval = setInterval(fetchOrder, 5000)

      // Show "Payment Received" fallback after 20 s, but keep polling
      fallbackTimeout = setTimeout(() => {
        if (!resolved) {
          setPaymentReceived(true)
          setIsLoading(false)
        }
      }, 20000)

      // Final cleanup after 3 minutes
      cleanupTimeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval)
      }, 180000)
    }

    init()

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      if (cleanupTimeout) clearTimeout(cleanupTimeout)
    }
  }, [sessionId, router])

  if (isLoading || !orderData) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          {paymentReceived ? (
            <>
              <div className="relative mx-auto mb-4 w-12 h-12">
                <CheckCircle2 className="h-12 w-12 text-[#59FFA0]" />
                <Loader2 className="animate-spin h-4 w-4 text-[#F9FDFF]/40 absolute -bottom-1 -right-1" />
              </div>
              <p className="font-sans text-[#F9FDFF] text-lg font-semibold mb-2">
                Payment Received!
              </p>
              <p className="font-sans text-sm text-[#F9FDFF]/60 mb-1">
                Your order is being confirmed — this page will update automatically.
              </p>
              <p className="font-sans text-xs text-[#F9FDFF]/40">
                A confirmation email with your tickets is on its way.
              </p>
              <Button
                onClick={() => router.push('/dashboard/tickets')}
                variant="ghost"
                className="mt-6 text-[#59FFA0]/80 hover:text-[#59FFA0]"
              >
                View My Tickets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin h-12 w-12 text-[#59FFA0] mx-auto mb-4" />
              <p className="font-sans text-[#F9FDFF]/60 mb-2">
                Confirming Your Order
              </p>
              <p className="font-sans text-sm text-[#F9FDFF]/40">
                Hang tight, this only takes a moment…
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const handleDownloadTickets = () => {
    // TODO: Generate PDF tickets
    alert('Ticket download will be implemented with PDF generation')
  }

  const handleShareTickets = () => {
    // TODO: Share functionality
    if (navigator.share) {
      navigator.share({
        title: `Tickets for ${orderData.eventName}`,
        text: `I'm going to ${orderData.eventName}!`,
        url: window.location.href,
      })
    } else {
      alert('Share functionality coming soon!')
    }
  }

  return (
    <div className="min-h-screen bg-[#121113] py-8 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles 
                className="text-[#59FFA0]" 
                style={{
                  width: `${10 + Math.random() * 20}px`,
                  height: `${10 + Math.random() * 20}px`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#59FFA0]/20 mb-6">
            <CheckCircle2 className="h-12 w-12 text-[#59FFA0]" />
          </div>
          <h1 className="font-header text-4xl md:text-5xl font-bold text-[#F9FDFF] mb-3">
            You're All Set! 🎉
          </h1>
          <p className="font-sans text-xl text-[#F9FDFF]/80 mb-2">
            Your tickets have been confirmed
          </p>
          <p className="font-sans text-[#F9FDFF]/60">
            Confirmation sent to <span className="text-[#59FFA0]">{orderData.email}</span>
          </p>
        </div>

        {/* Rest of your existing UI code stays the same */}
        {/* Order Details */}
        <div className="space-y-6 mb-8">
          {/* Confirmation Numbers */}
          <Card className="bg-gradient-to-br from-[#59FFA0]/10 via-[#1AC8ED]/5 to-transparent border-2 border-[#59FFA0]/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-label text-xs uppercase tracking-wider text-[#F9FDFF]/60 mb-1">
                    Order Number
                  </p>
                  <p className="font-mono text-lg font-bold text-[#59FFA0]">
                    {orderData.orderId}
                  </p>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-wider text-[#F9FDFF]/60 mb-1">
                    Confirmation Code
                  </p>
                  <p className="font-mono text-lg font-bold text-[#59FFA0]">
                    {orderData.confirmationCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="font-header text-2xl text-[#F9FDFF] flex items-center gap-2">
                <Ticket className="h-6 w-6 text-[#59FFA0]" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-slab-serif text-2xl font-bold text-[#F9FDFF] mb-4">
                  {orderData.eventName}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-[#59FFA0] mt-0.5" />
                    <div>
                      <p className="font-sans text-[#F9FDFF]">
                        {new Date(orderData.eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="font-sans text-sm text-[#F9FDFF]/60">
                        {new Date(orderData.eventDate).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#59FFA0] mt-0.5" />
                    <div>
                      <p className="font-sans text-[#F9FDFF]">{orderData.venueName}</p>
                      <p className="font-sans text-sm text-[#F9FDFF]/60">
                        {orderData.venueAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Purchased */}
          <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="font-header text-xl text-[#F9FDFF]">
                Tickets Purchased
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderData.tickets.map((ticket, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-4 bg-[#121113] rounded-lg border border-[#2A2A2A]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#59FFA0]/10">
                      <Ticket className="h-5 w-5 text-[#59FFA0]" />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-[#F9FDFF]">
                        {ticket.type}
                      </p>
                      <p className="font-sans text-sm text-[#F9FDFF]/60">
                        Quantity: {ticket.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-serif text-lg font-bold text-[#59FFA0]">
                    ${(ticket.price * ticket.quantity).toFixed(2)}
                  </p>
                </div>
              ))}

              <div className="h-px bg-[#2A2A2A] my-4" />
              
              <div className="flex items-center justify-between pt-2">
                <p className="font-sans text-lg text-[#F9FDFF]/60">Total Paid</p>
                <p className="font-serif text-3xl font-bold text-[#59FFA0]">
                  ${orderData.total.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Placeholder */}
          <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="font-header text-xl text-[#F9FDFF]">
                Your Ticket QR Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {orderData.tickets.map((ticket, idx) => (
                  Array.from({ length: ticket.quantity }).map((_, qIdx) => (
                    <div 
                      key={`${idx}-${qIdx}`}
                      className="p-6 bg-[#F9FDFF] rounded-lg text-center"
                    >
                      {/* QR Code Image */}
                      <div className="w-32 h-32 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                        {ticket.qrCodeData?.[qIdx] ? (
                          <img 
                            src={ticket.qrCodeData[qIdx]} 
                            alt={`QR Code for ${ticket.type}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <p className="text-[#121113]/40 text-xs">QR Code</p>
                        )}
                      </div>
                      <p className="font-sans text-sm font-semibold text-[#121113]">
                        {ticket.type} #{qIdx + 1}
                      </p>
                      <p className="font-mono text-xs text-[#121113]/60 mt-1">
                        {orderData.confirmationCode}-{idx}{qIdx}
                      </p>
                    </div>
                  ))
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 text-[#59FFA0] mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#F9FDFF] font-semibold mb-1">
                      Tickets sent to your email
                    </p>
                    <p className="font-sans text-xs text-[#F9FDFF]/60">
                      Check your inbox for your digital tickets. Show the QR code at the venue entrance.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Button
            onClick={handleDownloadTickets}
            className="flex-1 bg-[#59FFA0] hover:bg-[#59FFA0]/90 text-[#121113] font-semibold py-6 rounded-xl"
          >
            <Download className="h-5 w-5 mr-2" />
            Download Tickets
          </Button>
          
          <Button
            onClick={handleShareTickets}
            variant="outline"
            className="flex-1 border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F9FDFF] py-6 rounded-xl"
          >
            <Share2 className="h-5 w-5 mr-2" />
            Share Event
          </Button>
        </div>

        {/* Next Steps - keeping your existing code */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="font-header text-xl text-[#F9FDFF]">
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-[#59FFA0] text-[#121113] font-bold rounded-full w-6 h-6 flex items-center justify-center">
                1
              </Badge>
              <div>
                <p className="font-sans font-semibold text-[#F9FDFF] mb-1">
                  Check your email
                </p>
                <p className="font-sans text-sm text-[#F9FDFF]/60">
                  Your tickets and confirmation details have been sent to {orderData.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-[#59FFA0] text-[#121113] font-bold rounded-full w-6 h-6 flex items-center justify-center">
                2
              </Badge>
              <div>
                <p className="font-sans font-semibold text-[#F9FDFF] mb-1">
                  Save your tickets
                </p>
                <p className="font-sans text-sm text-[#F9FDFF]/60">
                  Download the PDF or add to your mobile wallet for easy access
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-[#59FFA0] text-[#121113] font-bold rounded-full w-6 h-6 flex items-center justify-center">
                3
              </Badge>
              <div>
                <p className="font-sans font-semibold text-[#F9FDFF] mb-1">
                  Show up and enjoy!
                </p>
                <p className="font-sans text-sm text-[#F9FDFF]/60">
                  Present your QR code at the venue entrance. See you there!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browse More Events */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => router.push('/events')}
            variant="ghost"
            className="text-[#F9FDFF]/60 hover:text-[#F9FDFF] hover:bg-[#1A1A1A]"
          >
            Browse More Events
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121113] flex items-center justify-center">
          <Loader2 className="animate-spin h-12 w-12 text-[#59FFA0]" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}