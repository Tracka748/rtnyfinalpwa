'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getRochesterWeather, WeatherData } from '@/lib/weather'

interface DateHeaderProps {
  selectedDate: string
  eventCount?: number
  isAllDates?: boolean
}

export function DateHeader({ selectedDate, eventCount = 0, isAllDates }: DateHeaderProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'h:mm a'))

  useEffect(() => {
    getRochesterWeather().then(setWeather).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(format(new Date(), 'h:mm a')), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-3 mx-auto max-w-[1200px]">
      {/* Left: conditional title */}
      {isAllDates ? (
        <div>
          <h1 className="font-header text-4xl md:text-5xl font-black text-white">
            All Events
          </h1>
          <p className="text-secondary text-sm mt-1">Rochester, NY</p>
        </div>
      ) : (
        <div>
          <h1 className="font-header text-4xl md:text-5xl font-black text-white">
            {format(parseISO(selectedDate), 'EEEE, MMMM d')}
          </h1>
          <p className="text-secondary text-sm mt-1">
            {eventCount > 0
              ? `${eventCount} events scheduled`
              : "Nothing scheduled — explore what's coming up"}
          </p>
        </div>
      )}

      {/* Right: Time + Weather */}
      <div suppressHydrationWarning className="flex items-center gap-2 text-white font-bold text-sm md:text-base shrink-0 ml-4">
        <span suppressHydrationWarning>{currentTime}</span>
        {weather && (
          <>
            <span className="text-white/40">•</span>
            <span>{weather.temp}</span>
            <span className="text-white/40">•</span>
            <span>{weather.description}</span>
            <span>{weather.emoji}</span>
          </>
        )}
      </div>
    </div>
  )
}
