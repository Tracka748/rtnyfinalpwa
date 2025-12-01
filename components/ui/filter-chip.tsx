"use client"

import { X } from "lucide-react"

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2 font-sans text-sm text-[#F9FDFF] transition-all hover:bg-[#2A2A2A]">
      <span className="text-[#A0A0A0]">{label}:</span>
      <span className="font-medium text-[#59FFA0]">{value}</span>
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 transition-all hover:bg-[#3A3A3A] active:scale-90"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}