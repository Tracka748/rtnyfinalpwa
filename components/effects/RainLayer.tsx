'use client'
import { useEffect, useRef } from 'react'

export function RainLayer() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const drops: { x: number; y: number; speed: number; length: number; opacity: number }[] = []
    for (let i = 0; i < 60; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 4 + Math.random() * 5,
        length: 12 + Math.random() * 18,
        opacity: 0.2 + Math.random() * 0.4,
      })
    }

    let animId: number
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drops.forEach(d => {
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + d.length * 0.15, d.y + d.length)
        ctx.strokeStyle = `rgba(180, 210, 255, ${d.opacity})`
        ctx.lineWidth = 1
        ctx.stroke()
        d.y += d.speed
        d.x += d.speed * 0.15
        if (d.y > canvas.height) {
          d.y = -d.length
          d.x = Math.random() * canvas.width
        }
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  )
}
