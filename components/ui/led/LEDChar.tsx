import React, { useEffect, useState } from 'react';
import { CHAR_MAPS } from './dot-maps';

export interface LEDCharProps {
  char: string;
  dotSize?: number;
  gap?: number;
  color?: string;
  boardMode?: boolean;
  shape?: 'circle' | 'square' | 'rounded' | 'diamond';
  revealed?: boolean;
  delay?: number;
}

interface DotProps {
  x: number;
  y: number;
  size: number;
  on: boolean;
  color: string;
  shape: 'circle' | 'square' | 'rounded' | 'diamond';
}

function Dot({ x, y, size, on, color, shape }: DotProps) {
  const opacity = on ? 1 : 0.08;
  const half = size / 2;
  const cx = x + half;
  const cy = y + half;

  if (shape === 'circle') {
    return <circle cx={cx} cy={cy} r={half} fill={color} opacity={opacity} />;
  }
  if (shape === 'square') {
    return <rect x={x} y={y} width={size} height={size} fill={color} opacity={opacity} />;
  }
  if (shape === 'rounded') {
    return (
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={size * 0.25}
        ry={size * 0.25}
        fill={color}
        opacity={opacity}
      />
    );
  }
  // diamond
  return (
    <polygon
      points={`${cx},${y} ${x + size},${cy} ${cx},${y + size} ${x},${cy}`}
      fill={color}
      opacity={opacity}
    />
  );
}

export default function LEDChar({
  char,
  dotSize = 6,
  gap = 1,
  color = '#ff4444',
  boardMode = false,
  shape = 'circle',
  revealed = true,
  delay = 0,
}: LEDCharProps) {
  const [isRevealed, setIsRevealed] = useState(revealed && delay === 0);

  useEffect(() => {
    if (!revealed) {
      setIsRevealed(false);
      return;
    }
    if (delay === 0) {
      setIsRevealed(true);
      return;
    }
    const timer = setTimeout(() => setIsRevealed(true), delay);
    return () => clearTimeout(timer);
  }, [revealed, delay]);

  const upper = char.toUpperCase();
  const map = CHAR_MAPS[upper] ?? CHAR_MAPS[' '];
  const rows = map.length;
  const cols = map[0].length;
  const step = dotSize + gap;
  const width = cols * step - gap;
  const height = rows * step - gap;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {boardMode && (
        <rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.6)" rx={2} />
      )}
      {map.map((row, r) =>
        row.map((cell, c) => (
          <Dot
            key={`${r}-${c}`}
            x={c * step}
            y={r * step}
            size={dotSize}
            on={isRevealed && cell === 1}
            color={color}
            shape={shape}
          />
        ))
      )}
    </svg>
  );
}
