interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: string;
  color?: 'green' | 'blue' | 'yellow' | 'white';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = 'green',
  trend,
}: StatsCardProps) {
  const colorClasses = {
    green: 'text-[#59FFA0]',
    blue: 'text-[#007BFF]',
    yellow: 'text-yellow-400',
    white: 'text-white',
  };

  const bgColorClasses = {
    green: 'bg-[#59FFA0]/10',
    blue: 'bg-[#007BFF]/10',
    yellow: 'bg-yellow-400/10',
    white: 'bg-white/10',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 hover:bg-white/[0.07] transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#7DD8E8] font-label uppercase tracking-wider mb-1 truncate">
            {title}
          </p>
          <p className={`text-2xl md:text-3xl font-bold truncate ${colorClasses[color]}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#7DD8E8] mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className={`${bgColorClasses[color]} p-2 md:p-3 rounded-lg self-start shrink-0`}>
            <span className="text-xl md:text-3xl">{icon}</span>
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-2 md:mt-3 flex items-center gap-2">
          <span className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-[#7DD8E8]">vs last period</span>
        </div>
      )}
    </div>
  );
}
