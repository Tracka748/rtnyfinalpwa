'use client'

import { useState, useEffect } from 'react'

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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={loading || !ready}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={
          isSupporting
            ? { backgroundColor: '#59FFA0', color: '#121113', border: '1px solid #59FFA0' }
            : { backgroundColor: 'transparent', color: '#59FFA0', border: '1px solid #59FFA0' }
        }
      >
        {isSupporting ? '✓ Supporting' : '❤️ Support This Partner'}
      </button>
      <p className="text-xs" style={{ color: 'rgba(249,253,255,0.4)' }}>
        {count.toLocaleString()} {count === 1 ? 'person supports' : 'people support'} this partner
      </p>
    </div>
  )
}
