'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ticketCount = searchParams.get('ticketCount') || '0'

  return (
    <div className="min-h-screen bg-[#121113] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">
        {/* Success Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#59FFA0]/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#59FFA0] to-[#1AC8ED] flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-[#121113]" strokeWidth={3} />
          </div>
        </div>
        
        {/* Success Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[#F9FDFF] font-[family-name:var(--font-rokkitt)]">
            Purchase Successful!
          </h1>
          <p className="text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)] text-lg">
            You've purchased {ticketCount} {ticketCount === '1' ? 'ticket' : 'tickets'}
          </p>
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A] space-y-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#59FFA0]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#59FFA0]">📧</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)] mb-1">
                Check Your Email
              </p>
              <p className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
                Confirmation and tickets have been sent to your email
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#59FFA0]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#59FFA0]">🎟️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)] mb-1">
                Access Your Tickets
              </p>
              <p className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
                View and manage your tickets in your dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => router.push('/dashboard')}
            className="
              flex-1 h-12 text-base font-semibold rounded-xl 
              bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] 
              hover:from-[#4DE690] hover:to-[#0AB8DD] 
              text-[#121113] 
              font-[family-name:var(--font-rubik)]
              shadow-lg shadow-[#59FFA0]/20 hover:shadow-xl hover:shadow-[#59FFA0]/30
              transition-all duration-300
            "
          >
            View My Tickets
          </Button>
          <Button
            onClick={() => router.push('/events')}
            variant="outline"
            className="
              flex-1 h-12 text-base font-semibold rounded-xl 
              border-[#2A2A2A] text-[#F9FDFF] 
              hover:bg-[#1A1A1A] hover:border-[#59FFA0]/30
              font-[family-name:var(--font-rubik)]
              transition-all duration-300
            "
          >
            Browse Events
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#59FFA0]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}