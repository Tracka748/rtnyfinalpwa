'use client'

import type { ReactNode } from 'react'

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
}

export function Field({ id, label, hint, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-white font-sans">
        {label}
        {optional && <span className="text-xs font-normal text-white/40">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-white/50">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
