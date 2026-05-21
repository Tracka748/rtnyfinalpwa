import LEDText from '@/components/ui/led/LEDText';

interface SectionTitleStripProps {
  label: string;
  sublabel?: string;
  accentColor?: string;
}

export default function SectionTitleStrip({
  label,
  sublabel = 'ROCHESTER · NEW YORK',
  accentColor = '#59FFA0',
}: SectionTitleStripProps) {
  const cols = Math.ceil(1440 / 12);
  const rows = Math.ceil(100 / 12);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: '#121113',
        padding: '20px 24px 16px',
      }}
    >
      {/* Layer 1 — dot field background */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={col * 12 + 6}
              cy={row * 12 + 6}
              r="1.5"
              fill="rgba(255,255,255,0.07)"
            />
          ))
        )}
      </svg>

      {/* Layers 2 & 3 — text content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Layer 2 — top sublabel */}
        <p
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: '#7DD8E8',
            margin: '0 0 8px 0',
          }}
        >
          {sublabel}
        </p>

        {/* Layer 3 — LED title */}
        <LEDText
          text={label.toUpperCase()}
          color="#ffffff"
          dotSize={5}
          gap={1}
          charGap={6}
          shape="circle"
          boardMode={false}
        />

        {/* Accent line */}
        <div
          style={{
            width: '48px',
            height: '2px',
            background: accentColor,
            marginTop: '10px',
          }}
        />
      </div>
    </div>
  );
}
