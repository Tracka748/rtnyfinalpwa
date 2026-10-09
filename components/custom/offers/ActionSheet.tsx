'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { CountedTextarea } from './CountedTextarea'
import { text } from './styles'

interface ActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  // 'danger' for delete/deactivate, 'primary' (mint) otherwise.
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  busy?: boolean
  confirmDisabled?: boolean
  error?: string | null
  children?: ReactNode
}

// Bottom sheet (same pattern as VibeModeSelectSheet): grabber, title, body, then
// Cancel + confirm. Centered and width-capped on larger screens.
export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  busy,
  confirmDisabled,
  error,
  children,
}: ActionSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto w-full sm:max-w-lg rounded-t-2xl bg-[#1a1a1a] border-t border-x border-white/10',
            'px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl max-h-[90dvh] overflow-y-auto',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom focus:outline-none'
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
          <DialogPrimitive.Title className="font-header text-[22px] font-bold leading-snug text-white">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className={cn(text.body, 'mt-2')}>{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}

          {children && <div className="mt-5">{children}</div>}

          {error && (
            <p role="alert" className={cn(text.error, 'mt-4')}>
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                disabled={busy}
                className="min-h-12 px-5 shrink-0 rounded-xl border border-white/20 text-white/85 font-sans text-base font-medium hover:border-white/40 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || confirmDisabled}
              aria-busy={busy}
              className={cn(
                'flex-1 min-w-0 min-h-12 px-4 rounded-xl font-header font-bold text-lg leading-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
                tone === 'danger'
                  ? 'bg-red-500 text-white hover:bg-red-500/90'
                  : 'bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90'
              )}
            >
              {busy && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const REVIEW_NOTE_MAX = 1000

interface RequestChangesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerTitle?: string
  busy?: boolean
  error?: string | null
  onSubmit: (note: string) => void
}

// Admin "Request changes": a required note (<= 1000 chars) the partner will see.
export function RequestChangesSheet({ open, onOpenChange, offerTitle, busy, error, onSubmit }: RequestChangesSheetProps) {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote('')
  }, [open])

  return (
    <ActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request changes"
      description={
        offerTitle
          ? `Tell the partner what to fix in “${offerTitle}”. They’ll see this note on their offer.`
          : 'Tell the partner what to fix. They’ll see this note on their offer.'
      }
      confirmLabel="Send back"
      onConfirm={() => onSubmit(note.trim())}
      busy={busy}
      confirmDisabled={!note.trim()}
      error={error}
    >
      <label htmlFor="review-note" className={cn(text.questionLabel, 'block mb-2')}>
        Note for the partner
      </label>
      <CountedTextarea
        id="review-note"
        value={note}
        onChange={setNote}
        maxLength={REVIEW_NOTE_MAX}
        rows={4}
        placeholder="e.g. Please add a price for the cake add-on and a cover photo."
      />
    </ActionSheet>
  )
}
