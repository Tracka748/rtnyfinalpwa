import React from 'react'

interface AlertProps {
  variant?: 'default' | 'destructive'
  className?: string
  children: React.ReactNode
}

function Alert({
  variant = 'default',
  className = '',
  children,
  ...props
}: AlertProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`
        relative rounded-lg border p-4 text-sm
        ${variant === 'default'
          ? 'border-border text-foreground'
          : 'border-destructive/50 text-destructive'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export { Alert }
