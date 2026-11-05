// One definition of the brand-mint primary button, so every package CTA looks the same.
// Uses the accent-primary token (#59FFA0) explicitly. The disabled look is a muted surface plus the
// button's own text (for example "Currently unavailable"), never opacity alone.
export const primaryButtonClass =
  'min-h-11 rounded-full bg-accent-primary px-6 text-base font-semibold text-background transition-colors ' +
  'hover:bg-accent-primary/90 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-accent-primary ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:bg-surface-elevated disabled:text-text-primary/60 disabled:opacity-100'

export const textButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-accent-secondary underline-offset-4 ' +
  'transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary'
