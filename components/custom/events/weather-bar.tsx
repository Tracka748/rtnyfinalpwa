'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getRochesterWeather, WeatherData } from '@/lib/weather'

export function WeatherBar() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    getRochesterWeather().then(setWeather).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="px-4 pb-4 mx-auto max-w-[1200px]">
      <p className="text-sm text-[#7DD8E8]">
        {format(time, 'h:mm a')}
        {weather && (
          <span className="ml-2 text-text-primary">
            · {weather.temp} · {weather.description} {weather.emoji}
          </span>
        )}
      </p>
    </div>
  )
}
