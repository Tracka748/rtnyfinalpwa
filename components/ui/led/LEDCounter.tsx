import React, { useEffect, useRef, useState } from 'react';
import LEDText from './LEDText';
import LEDDisplay from './LEDDisplay';

export interface LEDCounterProps {
  value: number;
  dotSize?: number;
  color?: string;
  label?: string;
  padStart?: number;
  boardMode?: boolean;
  shape?: 'circle' | 'square' | 'rounded' | 'diamond';
}

export default function LEDCounter({
  value,
  dotSize = 6,
  color = '#ff4444',
  label,
  padStart = 0,
  boardMode = false,
  shape = 'circle',
}: LEDCounterProps) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const duration = 800;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(from + (to - from) * eased);
      setCurrent(val);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
        startRef.current = null;
      }
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const display = padStart > 0 ? String(current).padStart(padStart, '0') : String(current);

  return (
    <LEDDisplay color={color} label={label} boardMode={boardMode}>
      <LEDText
        text={display}
        dotSize={dotSize}
        color={color}
        boardMode={false}
        shape={shape}
      />
    </LEDDisplay>
  );
}
