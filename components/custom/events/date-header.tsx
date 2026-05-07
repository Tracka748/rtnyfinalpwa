'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getRochesterWeather, WeatherData } from '@/lib/weather'
import { useWeatherState } from '@/hooks/useWeatherState'
import { RainLayer } from '@/components/effects/RainLayer'
import { SnowLayer } from '@/components/effects/SnowLayer'

interface DateHeaderProps {
  selectedDate: string
  eventCount?: number
  isAllDates?: boolean
}

export function DateHeader({ selectedDate, eventCount = 0, isAllDates }: DateHeaderProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [formattedTime, setFormattedTime] = useState(format(new Date(), 'h:mm'))
  const [ampm, setAmpm] = useState(format(new Date(), 'a'))

  useEffect(() => {
    getRochesterWeather().then(setWeather).catch(() => {})
  }, [])

  useEffect(() => {
    const tick = () => {
      setFormattedTime(format(new Date(), 'h:mm'))
      setAmpm(format(new Date(), 'a'))
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const { isNight, isDawn, isDusk, isRain, isSnow, isClear, tempF } =
    useWeatherState(weather?.description ?? '', weather?.tempF ?? 60)

  const skyTint = isNight
    ? 'linear-gradient(to bottom, rgba(4,2,20,0.7) 0%, rgba(8,4,30,0.4) 50%, rgba(4,2,10,0.85) 100%)'
    : isDawn
    ? 'linear-gradient(to bottom, rgba(180,80,20,0.3) 0%, rgba(80,20,60,0.2) 50%, rgba(8,4,10,0.8) 100%)'
    : isDusk
    ? 'linear-gradient(to bottom, rgba(120,40,80,0.35) 0%, rgba(60,20,40,0.2) 50%, rgba(8,4,10,0.8) 100%)'
    : isRain
    ? 'linear-gradient(to bottom, rgba(10,20,40,0.6) 0%, rgba(8,15,30,0.3) 50%, rgba(4,6,10,0.85) 100%)'
    : isClear && tempF > 65
    ? 'linear-gradient(to bottom, rgba(20,60,140,0.25) 0%, rgba(255,160,40,0.08) 50%, rgba(8,4,10,0.75) 100%)'
    : 'linear-gradient(to bottom, rgba(20,24,40,0.45) 0%, rgba(10,12,20,0.2) 50%, rgba(6,8,12,0.8) 100%)'

  const cityGlow = isNight
    ? 'radial-gradient(ellipse at center bottom, rgba(180,80,255,0.12) 0%, transparent 70%)'
    : isRain
    ? 'radial-gradient(ellipse at center bottom, rgba(40,80,160,0.15) 0%, transparent 70%)'
    : isClear && tempF > 65
    ? 'radial-gradient(ellipse at center bottom, rgba(255,140,30,0.3) 0%, transparent 70%)'
    : 'radial-gradient(ellipse at center bottom, rgba(200,100,30,0.18) 0%, transparent 70%)'

  const imgFilter = isNight
    ? 'brightness(0.5) saturate(0.7)'
    : isDawn || isDusk
    ? 'brightness(0.75) saturate(1.1) hue-rotate(-10deg)'
    : isClear && tempF > 65
    ? 'brightness(1.1) saturate(1.2)'
    : isRain
    ? 'brightness(0.55) saturate(0.6)'
    : 'brightness(0.8)'

  return (
    <div className="px-4 pt-4 pb-2 mx-auto max-w-[1200px]">
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: '200px' }}>

        {/* LAYER 1: Rochester skyline — always visible */}
        <img
          src="/images/rochester-skyline.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_65%]"
          style={{ filter: imgFilter, transition: 'filter 1.5s ease' }}
        />

        {/* LAYER 2: Time-of-day sky tint overlay */}
        <div
          className="absolute inset-0"
          style={{ background: skyTint, transition: 'background 2s ease' }}
        />

        {/* LAYER 3: City glow at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '70px', background: cityGlow, transition: 'background 2s ease' }}
        />

        {/* LAYER 4: Sun — clear + daytime only */}
        {isClear && !isNight && (
          <div
            className="absolute"
            style={{
              top: '16px',
              right: '16px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,230,100,0.9) 0%, rgba(255,200,0,0.6) 40%, transparent 70%)',
              boxShadow: '0 0 40px 12px rgba(255,200,0,0.25)',
              animation: 'sunPulse 4s ease-in-out infinite',
            }}
          />
        )}

        {/* LAYER 5: Moon — nighttime only */}
        {isNight && (
          <div
            className="absolute"
            style={{
              top: '16px',
              right: '16px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #f8f8e8, #c8c8a8)',
              boxShadow: '0 0 16px 4px rgba(200,200,160,0.25)',
            }}
          />
        )}

        {/* LAYER 6: Rain animation */}
        {isRain && <RainLayer />}

        {/* LAYER 7: Snow animation */}
        {isSnow && <SnowLayer />}

        {/* LAYER 8: Content */}
        <div
          className="relative z-10 p-5"
          style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          {/* TOP: Date — left aligned */}
          <div>
            {isAllDates ? (
              <>
                <div style={{
                  color: '#fff', fontSize: '26px', fontWeight: 800,
                  lineHeight: 1.1, letterSpacing: '-0.5px',
                  textShadow: '0 2px 16px rgba(0,0,0,0.9)',
                }}>
                  All Events
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>
                  Rochester, NY
                </div>
              </>
            ) : (
              <>
                <div style={{
                  color: '#fff', fontSize: '26px', fontWeight: 800,
                  lineHeight: 1.1, letterSpacing: '-0.5px',
                  textShadow: '0 2px 16px rgba(0,0,0,0.9)',
                }}>
                  {format(parseISO(selectedDate), 'EEEE,')}
                </div>
                <div style={{
                  color: '#fff', fontSize: '26px', fontWeight: 800,
                  lineHeight: 1.1, letterSpacing: '-0.5px',
                  textShadow: '0 2px 16px rgba(0,0,0,0.9)',
                  marginTop: '6px',
                }}>
                  {format(parseISO(selectedDate), 'MMMM d')}
                </div>
                <div style={{ color: '#7DD8E8', fontSize: '11px', marginTop: '10px' }}>
                  {eventCount > 0
                    ? `${eventCount} events scheduled`
                    : "Nothing scheduled — explore what's coming up"}
                </div>
              </>
            )}
          </div>

          {/* BOTTOM ROW: Time left, Weather right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>

            {/* Time — bottom left, matches date style */}
            <div suppressHydrationWarning style={{
              color: '#fff', fontSize: '26px', fontWeight: 800,
              letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.9)',
              lineHeight: 1,
            }}>
              <span suppressHydrationWarning>{formattedTime}</span>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                color: 'rgba(255,255,255,0.45)', marginLeft: '4px', letterSpacing: '0.08em',
              }}>
                {ampm}
              </span>
            </div>

            {/* Weather — bottom right, aligned under moon/sun */}
            {weather && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: '#fff', fontSize: '28px', fontWeight: 700,
                  letterSpacing: '-0.5px',
                  textShadow: '0 1px 12px rgba(0,0,0,0.95)',
                  lineHeight: 1,
                }}>
                  {weather.tempF}°F
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  gap: '6px', marginTop: '5px',
                }}>
                  <span style={{ fontSize: '16px' }}>{weather.emoji}</span>
                  <span style={{
                    color: 'rgba(255,255,255,0.65)', fontSize: '13px',
                    fontWeight: 400, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 8px rgba(0,0,0,0.95)',
                  }}>
                    {weather.description}
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
