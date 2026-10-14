type StatTileColor = 'white' | 'green' | 'yellow' | 'cyan';

const valueColors: Record<StatTileColor, string> = {
  white: 'text-white',
  green: 'text-[#59FFA0]',
  yellow: 'text-yellow-400',
  cyan: 'text-[#1AC8ED]',
};

interface StatTileProps {
  label: string;
  value: number | string;
  color?: StatTileColor;
}

export function StatTile({ label, value, color = 'white' }: StatTileProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
      <p className={`text-4xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-xs text-[#7DD8E8] mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
