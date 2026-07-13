'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  partnerId: string
  initialCount: number
}

export default function SupportButton({ partnerId, initialCount }: Props) {
  const [isSupporting, setIsSupporting] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/partners/${partnerId}/support`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setIsSupporting(json.data.is_supporting)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [partnerId])

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const method = isSupporting ? 'DELETE' : 'POST'
      const res = await fetch(`/api/v1/partners/${partnerId}/support`, { method })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (res.status === 409) {
        setIsSupporting(true)
        return
      }
      if (res.ok) {
        setIsSupporting((prev) => !prev)
        setCount((prev) => (isSupporting ? prev - 1 : prev + 1))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="mx-4 mb-5 rounded-2xl p-5 flex items-center gap-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 48, backgroundColor: 'rgba(89,255,160,0.12)' }}
      >
        <Heart size={22} color="#59FFA0" fill={isSupporting ? '#59FFA0' : 'none'} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-slab-serif text-base font-bold text-[#F9FDFF]">
          Support This Partner
        </h3>
        <p className="font-sans text-xs text-[#F9FDFF]/60 mt-0.5 truncate">
          Show your love and help this partner grow
        </p>
        <p className="font-label text-[10px] tracking-widest uppercase text-[#59FFA0] mt-1.5">
          {count.toLocaleString()} {count === 1 ? 'supporter' : 'supporters'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading || !ready}
        className="flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
        style={
          isSupporting
            ? { backgroundColor: 'transparent', color: '#59FFA0', border: '1px solid #59FFA0' }
            : { backgroundColor: '#59FFA0', color: '#121113', border: '1px solid #59FFA0' }
        }
      >
        {isSupporting ? 'Supporting' : 'Support'}
      </button>
    </div>
  )
}
