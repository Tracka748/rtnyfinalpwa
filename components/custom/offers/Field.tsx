'use client'

import type { ReactNode } from 'react'

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
  // Shows a "Needed to submit" tag; saving a draft doesn't require it.
  neededToSubmit?: boolean
  // Chip groups aren't form controls, so they get a plain caption instead of <label>.
  group?: boolean
  children: ReactNode
}

export function NeededTag() {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1AC8ED]/10 text-[#1AC8ED] font-label">
      Needed to submit
    </span>
  )
}

export function Field({ id, label, hint, error, optional, neededToSubmit, group, children }: FieldProps) {
  const caption = (
    <>
      {label}
      {neededToSubmit ? (
        <NeededTag />
      ) : optional ? (
        <span className="text-xs font-normal text-white/40">Optional</span>
      ) : null}
    </>
  )
  const captionClass = 'flex items-center gap-2 flex-wrap text-sm font-medium text-white font-sans'

  return (
    <div className="space-y-1.5">
      {group ? (
        <p id={`${id}-label`} className={captionClass}>
          {caption}
        </p>
      ) : (
        <label htmlFor={id} className={captionClass}>
          {caption}
        </label>
      )}
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
