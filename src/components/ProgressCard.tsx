/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Award } from 'lucide-react';

interface ProgressCardProps {
  completedCount: number;
  totalCount: number;
  streak: number;
  onRefreshClick?: () => void;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  completedCount,
  totalCount,
  streak,
  onRefreshClick,
}) => {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Circumference for circular progress stroke
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container relative overflow-hidden flex items-center justify-between gap-4">
      {/* Dynamic background blur accent */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex-1 space-y-2 z-10">
        <div className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Today's Ritual</span>
        </div>

        <h3 className="font-headline-lg-mobile text-xl text-on-surface tracking-tight font-bold">
          {percentage === 100 ? 'Fully Refreshed!' : 'Step-by-step progress'}
        </h3>

        <p className="text-on-surface-variant font-body-md text-sm">
          You completed <span className="font-bold text-primary">{completedCount}</span> of{' '}
          <span className="font-bold">{totalCount}</span> routine habits.
        </p>

        <div className="flex items-center gap-1 text-xs text-tertiary font-medium pt-1.5">
          <Award className="w-4 h-4 text-tertiary-container fill-tertiary" />
          <span>
            Active Streak: <strong>{streak} Days</strong>
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-center flex-shrink-0 w-24 h-24">
        {/* SVG Progress Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="text-surface-container-high fill-none stroke-[7px]"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="text-primary-container fill-none stroke-[7.5px] transition-all duration-500 ease-out"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-bold text-on-surface">{percentage}%</span>
          <span className="text-xxs text-on-surface-variant/70 tracking-tight font-sans">done</span>
        </div>
      </div>
    </div>
  );
};
