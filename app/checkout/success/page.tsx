'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ticketCount = searchParams.get('ticketCount') || '0'

  return (
    <div className="min-h-screen bg-[#121113] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle className="h-16 w-16 text-[#59FFA0] mx-auto" />
        
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-3xl font-bold text-[#F9FDFF]">
            Purchase Successful!
          </h1>
          <p className="text-[#A0A0A0] font-[family-name:var(--font-rubik)]">
            You've purchased {ticketCount} {ticketCount === '1' ? 'ticket' : 'tickets'}
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
          <p className="text-sm text-[#A0A0A0] font-[family-name:var(--font-rubik)]">
            Your tickets have been added to your account.
            You can view them in your dashboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-[#59FFA0] hover:bg-[#4DE08A] text-[#121113] font-[family-name:var(--font-montserrat)]"
          >
            View My Tickets
          </Button>
          <Button
            onClick={() => router.push('/events')}
            variant="outline"
            className="flex-1 border-[#2A2A2A] text-[#F9FDFF] hover:bg-[#1a1a1a]"
          >
            Browse More Events
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
        <div className="text-[#59FFA0]">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}