'use client'

export function NoPartnerState({ message }: { message?: string | null }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-white text-lg font-header">
          {message ?? 'You don’t have a partner profile yet.'}
        </p>
        {!message && <p className="text-[#A0A0A0] text-sm font-sans">Contact RTNY admin to get set up.</p>}
        <a href="/dashboard" className="inline-flex min-h-12 items-center text-[#59FFA0] text-sm hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  )
}
