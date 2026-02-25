'use client';

import { useState } from 'react';
import { ReactNode } from 'react';

interface CollapsibleChartProps {
  title: string;
  icon?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleChart({
  title,
  icon,
  children,
  defaultExpanded = true,
}: CollapsibleChartProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div>
      {/* Mobile-only toggle — appears above the chart card */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full flex items-center justify-between px-1 py-2 mb-1 text-left"
      >
        <span className="text-sm font-semibold text-white">
          {icon && <span className="mr-1.5">{icon}</span>}
          {title}
        </span>
        <span className="text-gray-500 text-xs ml-2">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      <div className={isExpanded ? 'block' : 'hidden md:block'}>
        {children}
      </div>
    </div>
  );
}
