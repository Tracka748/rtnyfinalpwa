'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Campaign art that may or may not exist yet. The box is sized up front (no layout
// shift) and shows the inline SVG fallback; the WebP fades in on top once it loads.
// A missing file (404) is remembered for the session so it isn't requested again.
const missing = new Set<string>()

interface ThemedImageProps {
  src: string
  width: number
  height: number
  // Rendered until (and unless) the image loads.
  fallback: ReactNode
  // Above-the-fold art loads eagerly; everything else is lazy.
  priority?: boolean
  // Campaign art is decorative by default (alt=""). Pass alt only for meaningful images.
  alt?: string
  // Art generated on pure black uses mix-blend-mode: screen so the black drops out.
  blendScreen?: boolean
  // Fill the parent's reserved box (responsive art) instead of a fixed width × height.
  fill?: boolean
  // Reports whether the real image is showing (false while loading or when missing).
  onLoadedChange?: (loaded: boolean) => void
  className?: string
}

export function ThemedImage({
  src,
  width,
  height,
  fallback,
  priority,
  alt = '',
  blendScreen = true,
  fill,
  onLoadedChange,
  className,
}: ThemedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(() => missing.has(src))

  return (
    <div
      className={cn('relative shrink-0', fill && 'h-full w-full', className)}
      style={fill ? undefined : { width, height }}
      aria-hidden={alt ? undefined : true}
    >
      <div className={cn('absolute inset-0 transition-opacity duration-300', loaded && !failed ? 'opacity-0' : 'opacity-100')}>
        {fallback}
      </div>
      {!failed && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          // Files are pre-sized WebP (≤ ~50 KB); skip the optimizer so a missing file
          // is a plain 404 instead of an optimizer error.
          unoptimized
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={() => {
            setLoaded(true)
            onLoadedChange?.(true)
          }}
          onError={() => {
            missing.add(src)
            setFailed(true)
            onLoadedChange?.(false)
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          style={blendScreen ? { mixBlendMode: 'screen' } : undefined}
        />
      )}
    </div>
  )
}
