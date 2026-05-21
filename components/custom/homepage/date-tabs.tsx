"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DateTabsProps {
  onDateChange?: (date: string) => void
}

export function DateTabs({ onDateChange }: DateTabsProps) {
  const router = useRouter()
  const [activeDate, setActiveDate] = useState("today")

  const dates = []
  const today = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase()
    const day = date.getDate()
    const dayName = i === 0 ? "Today" : date.toLocaleString("en-US", { weekday: "short" })
    const value = date.toISOString().split("T")[0]

    dates.push({
      id: `date-${i}`,
      month,
      day,
      dayName,
      value,
      isToday: i === 0,
    })
  }

  const handleDateClick = (date: (typeof dates)[0]) => {
    setActiveDate(date.id)
    onDateChange?.(date.value)
    router.push(`/events?date=${date.value}`)
  }

  return (
    <div className="w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide snap-x snap-mandatory">
          {dates.map((date) => (
            <button
              key={date.id}
              onClick={() => handleDateClick(date)}
              className={`shrink-0 rounded-lg border-2 transition-all snap-start ${
                activeDate === date.id
                  ? "bg-accent-primary text-background border-accent-primary"
                  : "bg-surface text-[#7DD8E8] border-border hover:border-accent-primary/50"
              }`}
              style={{ width: "80px", padding: "8px 16px" }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    activeDate === date.id ? "text-background/70" : "text-[#7DD8E8]"
                  }`}
                >
                  {date.month}
                </div>
                <div
                  className={`text-[20px] font-bold leading-none ${
                    activeDate === date.id ? "text-background" : "text-text-primary"
                  }`}
                >
                  {date.day}
                </div>
                <div
                  className={`text-[11px] leading-none ${
                    activeDate === date.id ? "text-background/80" : "text-[#7DD8E8]"
                  }`}
                >
                  {date.dayName}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
