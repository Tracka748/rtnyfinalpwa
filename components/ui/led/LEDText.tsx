import React from 'react';
import LEDChar from './LEDChar';

export interface LEDTextProps {
  text: string;
  dotSize?: number;
  gap?: number;
  charGap?: number;
  color?: string;
  boardMode?: boolean;
  shape?: 'circle' | 'square' | 'rounded' | 'diamond';
}

export default function LEDText({
  text,
  dotSize = 6,
  gap = 1,
  charGap = 4,
  color = '#ff4444',
  boardMode = false,
  shape = 'circle',
}: LEDTextProps) {
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
          revealed
        />
      ))}
    </div>
  );
}
