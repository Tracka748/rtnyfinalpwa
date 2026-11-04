'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Bottom sheet below 768px, centered modal from 768px up: CSS only, one Radix Dialog (focus trap,
 * Escape and scroll lock included). Animations are skipped for prefers-reduced-motion users.
 */
export function SheetDialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-surface shadow-xl outline-none',
          'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl',
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out',
          'motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:fade-out-0',
          'max-md:motion-safe:data-[state=open]:slide-in-from-bottom max-md:motion-safe:data-[state=closed]:slide-out-to-bottom',
          'md:motion-safe:data-[state=open]:zoom-in-95 md:motion-safe:data-[state=closed]:zoom-out-95',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-text-primary/70 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
