import type { CSSProperties } from 'react';

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`bg-white/5 rounded-lg animate-pulse ${className ?? ''}`}
      style={style}
    />
  );
}
