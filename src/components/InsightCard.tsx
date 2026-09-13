/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Lucide from 'lucide-react';
import { WeeklyInsight } from '../types';

interface InsightCardProps {
  insight: WeeklyInsight;
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, className = '' }) => {
  const IconComponent = (Lucide[insight.icon as keyof typeof Lucide] ||
    Lucide.Award) as React.ComponentType<{ className?: string }>;

  return (
    <div
      className={`bg-white p-5 rounded-3xl shadow-sm border border-surface-container flex flex-col items-center justify-center text-center gap-3 transition-transform duration-200 hover:scale-[1.02] ${className}`}
    >
      {/* Icon badge circle */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${insight.colorClass}`}
      >
        {IconComponent && <IconComponent className="w-5 h-5" />}
      </div>

      {/* Info labels */}
      <div className="space-y-0.5">
        <span className="font-headline-md text-base md:text-lg text-on-surface font-bold block tracking-tight line-clamp-1">
          {insight.title}
        </span>
        <p className="font-label-sm text-xxs tracking-wide uppercase text-on-surface-variant font-semibold">
          {insight.label}
        </p>
      </div>
    </div>
  );
};
