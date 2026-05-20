import React from 'react';

export interface LEDDisplayProps {
  children: React.ReactNode;
  color?: string;
  label?: string;
  boardMode?: boolean;
}

export default function LEDDisplay({
  children,
  color = '#ff4444',
  label,
  boardMode = false,
}: LEDDisplayProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: boardMode ? 12 : 0,
        background: boardMode ? '#111' : 'transparent',
        borderRadius: boardMode ? 8 : 0,
        border: boardMode ? '1px solid #333' : 'none',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color,
            opacity: 0.6,
            fontFamily: 'monospace',
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}
