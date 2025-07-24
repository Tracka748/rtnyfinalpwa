import React from 'react'
import { cn } from '../../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline'
  className?: string
  asChild?: boolean
}

function Button({
  children,
  variant = 'default',
  className = '',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? React.Fragment : 'button'

  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : variant === 'destructive'
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Button }
