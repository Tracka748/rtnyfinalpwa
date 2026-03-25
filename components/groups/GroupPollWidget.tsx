'use client'

import { useState } from 'react'
import { GroupPoll } from '@/types/groups'

interface GroupPollWidgetProps {
  poll: GroupPoll & { user_vote?: string | null }
  groupSlug: string
  accentColor?: string
}

function totalVotes(options: GroupPoll['options']): number {
  return options.reduce((sum, o) => sum + (o.votes || 0), 0)
}

export function GroupPollWidget({ poll, groupSlug: _groupSlug, accentColor = '#59FFA0' }: GroupPollWidgetProps) {
  const [localPoll, setLocalPoll] = useState(poll)
  const [userVote, setUserVote] = useState<string | null>(poll.user_vote ?? null)
  const [loading, setLoading] = useState(false)

  const isClosed = poll.closes_at ? new Date(poll.closes_at) < new Date() : false
  const showResults = !!userVote || isClosed
  const total = totalVotes(localPoll.options)

  const handleVote = async (optionId: string) => {
    if (loading || showResults) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUserVote(optionId)
        if (data.data?.poll) {
          setLocalPoll(data.data.poll)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1a1c] rounded-xl border border-white/10 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-header font-semibold text-base text-white">{localPoll.question}</h3>
        {isClosed && (
          <span className="text-[10px] font-label uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-white/10 text-[#7DD8E8] shrink-0">
            Poll closed
          </span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {localPoll.options.map(option => {
          const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0
          const isSelected = userVote === option.id

          if (showResults) {
            return (
              <div key={option.id} className="relative">
                {/* Bar background */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isSelected ? `${accentColor}33` : 'rgba(255,255,255,0.06)',
                  }}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <span className="font-sans text-sm text-white/80 flex items-center gap-2">
                    {isSelected && <span style={{ color: accentColor }}>✓</span>}
                    {option.label}
                  </span>
                  <span className="font-label text-xs font-semibold" style={{ color: isSelected ? accentColor : 'rgba(255,255,255,0.4)' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            )
          }

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={loading}
              className="w-full text-left px-3 py-2 rounded-lg border border-white/20 font-sans text-sm text-white/80 transition-all hover:border-opacity-100 disabled:opacity-50"
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = accentColor }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {option.label}
                </span>
              ) : option.label}
            </button>
          )
        })}
      </div>

      {total > 0 && showResults && (
        <p className="font-label text-[11px] text-white/30 mt-3">{total} vote{total !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
