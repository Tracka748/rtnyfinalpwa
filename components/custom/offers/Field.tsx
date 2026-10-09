'use client'

import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupErrorClass, space, text } from './styles'

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
    <span className={cn(text.neededTag, 'px-2 py-0.5 rounded bg-[#1AC8ED]/10 whitespace-nowrap')}>
      Needed to submit
    </span>
  )
}

export function Field({ id, label, hint, error, optional, neededToSubmit, group, children }: FieldProps) {
  const caption = (
    <>
      <span className="min-w-0 break-words">{label}</span>
      {neededToSubmit ? (
        <NeededTag />
      ) : optional ? (
        <span className={cn(text.helper, 'font-normal')}>Optional</span>
      ) : null}
    </>
  )
  const captionClass = cn('flex items-center gap-x-2 gap-y-1 flex-wrap', text.questionLabel)

  return (
    <div className={space.field}>
      {group ? (
        <p id={`${id}-label`} className={captionClass}>
          {caption}
        </p>
      ) : (
        <label htmlFor={id} className={captionClass}>
          {caption}
        </label>
      )}
      {group ? <div className={error ? groupErrorClass : undefined}>{children}</div> : children}
      {error ? (
        <p id={`${id}-error`} role="alert" className={cn(text.error, 'flex items-start gap-1.5')}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={text.helper}>
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
