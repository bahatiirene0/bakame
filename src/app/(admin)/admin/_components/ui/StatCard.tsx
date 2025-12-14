'use client';

/**
 * StatCard Component
 *
 * Displays a single metric with:
 * - Icon
 * - Title
 * - Value
 * - Optional trend indicator
 */

import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}

const COLOR_CLASSES = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'green',
}: StatCardProps) {
  const colorClasses = COLOR_CLASSES[color];

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${colorClasses.bg}`}>
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.value >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
