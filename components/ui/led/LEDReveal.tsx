import React, { useEffect, useState } from 'react';
import LEDChar from './LEDChar';

export interface LEDRevealProps {
  text: string;
  dotSize?: number;
  gap?: number;
  charGap?: number;
  color?: string;
  boardMode?: boolean;
  shape?: 'circle' | 'square' | 'rounded' | 'diamond';
  stagger?: number;
}

export default function LEDReveal({
  text,
  dotSize = 6,
  gap = 1,
  charGap = 4,
  color = '#ff4444',
  boardMode = false,
  shape = 'circle',
  stagger = 80,
}: LEDRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(true);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: charGap }}>
      {text.split('').map((char, i) => (
        <LEDChar
          key={i}
          char={char}
          dotSize={dotSize}
          gap={gap}
          color={color}
          boardMode={boardMode}
          shape={shape}
          revealed={revealed}
          delay={i * stagger}
        />
      ))}
    </div>
  );
}
