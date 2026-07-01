import { ReactNode } from 'react'

const COLORS = {
  mint: '#59FFA0',
  cyan: '#1AC8ED',
} as const

interface ProfileSectionProps {
  color: keyof typeof COLORS
  label?: string
  children: ReactNode
}

export default function ProfileSection({ color, label, children }: ProfileSectionProps) {
  const hex = COLORS[color]
  return (
    <div
      className="mx-4 mb-5 rounded-[22px] px-5 py-5"
      style={{
        border: `1px solid ${hex}66`,
        boxShadow: `0 0 0 1px ${hex}0D inset, 0 0 24px ${hex}1F, 0 0 60px ${hex}0A`,
        backgroundColor: 'rgba(255,255,255,0.015)',
      }}
    >
      {label && (
        <span
          className="font-label text-xs tracking-[0.3em] uppercase block mb-4"
          style={{ color: hex }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
