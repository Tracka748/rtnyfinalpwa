"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

interface PointsFeedbackProps {
  points: number
  currentBadge: string
  nextBadge: string
  progress: number
}

export function PointsFeedback({ points, currentBadge, nextBadge, progress }: PointsFeedbackProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-elevated p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-3xl">🏅</span>
          <h3 className="text-xl font-bold text-text-primary">You're an {currentBadge}</h3>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">Progress to {nextBadge}</span>
            <span className="font-semibold text-accent-primary">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
            <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Earn opportunities */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-text-primary">🎁 Ways to earn today:</h4>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <span>•</span>
              <span>
                Attend 1 event <span className="font-semibold text-accent-primary">(+200)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span>•</span>
              <span>
                Review a venue <span className="font-semibold text-accent-primary">(+50)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span>•</span>
              <span>
                Invite a friend <span className="font-semibold text-accent-primary">(+300)</span>
              </span>
            </li>
          </ul>
        </div>

        <Button className="w-full bg-accent-primary text-background hover:bg-accent-primary/90">
          Earn More Points
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
