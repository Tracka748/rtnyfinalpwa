'use client'

import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VibeModeSelectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPrompt?: () => void
  onSelectPersonalized?: () => void
}

export default function VibeModeSelectSheet({
  open,
  onOpenChange,
  onSelectPrompt,
  onSelectPersonalized,
}: VibeModeSelectSheetProps) {
  const handlePrompt = () => {
    if (onSelectPrompt) {
      onSelectPrompt()
    } else {
      console.log('selected: prompt')
    }
    onOpenChange(false)
  }

  const handlePersonalized = () => {
    if (onSelectPersonalized) {
      onSelectPersonalized()
    } else {
      console.log('selected: personalized')
    }
    onOpenChange(false)
  }

  const options = [
    {
      key: 'prompt',
      icon: '👀',
      title: "What's the Vibe?",
      subtitle: 'Ask your social following what’s happening.',
      accentClass: 'border-accent-secondary/30 bg-accent-secondary/5 hover:bg-accent-secondary/10',
      onSelect: handlePrompt,
    },
    {
      key: 'personalized',
      icon: '⭐',
      title: 'My Vibes',
      subtitle: 'Share your personalized RTNY vibe.',
      accentClass: 'border-accent-primary/30 bg-accent-primary/5 hover:bg-accent-primary/10',
      onSelect: handlePersonalized,
    },
  ]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom focus:outline-none"
        >
          {/* Grabber — signals this is a dismissible sheet */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

          <DialogPrimitive.Title className="font-slab-serif text-lg font-semibold text-text-primary text-center mb-1">
            What&apos;s your vibe?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-text-secondary/70 text-center mb-5">
            Choose how you want to share tonight.
          </DialogPrimitive.Description>

          <div className="flex flex-col gap-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.onSelect}
                className={cn(
                  'w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors touch-manipulation active:scale-[0.98]',
                  opt.accentClass
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-2xl">
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-sans font-semibold text-text-primary text-sm">{opt.title}</p>
                  <p className="font-sans text-text-secondary/70 text-xs mt-0.5">{opt.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-text-secondary/60 hover:text-text-primary transition-colors focus:outline-none touch-manipulation">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
