/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Lucide from 'lucide-react';
import { Habit } from '../types';

interface HabitCardProps {
  habit: Habit;
  onToggleComplete: (e: React.MouseEvent) => void;
  onViewDetails: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onToggleComplete,
  onViewDetails,
}) => {
  // Safe dynamic lucide icon loading
  const IconComponent = (Lucide[habit.icon as keyof typeof Lucide] || Lucide.Compass) as React.ComponentType<{ className?: string }>;

  // Category Color Theming
  let categoryColors = 'bg-surface-container text-on-surface-variant';
  switch (habit.category) {
    case 'Health':
      categoryColors = 'bg-[#ccf078]/25 text-[#4d6700]';
      break;
    case 'Focus':
      categoryColors = 'bg-[#a6e2ff]/25 text-[#24657e]';
      break;
    case 'Mood':
      categoryColors = 'bg-[#ff9f67]/15 text-[#944a19]';
      break;
    case 'Learning':
      categoryColors = 'bg-purple-100 text-purple-700';
      break;
    case 'Movement':
      categoryColors = 'bg-emerald-100 text-emerald-800';
      break;
  }

  return (
    <div
      onClick={onViewDetails}
      className={`bg-white rounded-3xl p-5 shadow-sm border ${
        habit.completedToday ? 'border-primary-container/30 bg-orange-50/10' : 'border-surface-container'
      } hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Habit Icon Container */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            habit.completedToday ? 'bg-primary-container/20 text-primary' : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          {IconComponent && <IconComponent className="w-6 h-6" />}
        </div>

        {/* Text descriptions */}
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`font-semibold text-base transition-colors leading-snug ${
                habit.completedToday ? 'text-on-surface/60 line-through' : 'text-on-surface'
              }`}
            >
              {habit.name}
            </h4>
            <span className={`text-xxs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${categoryColors}`}>
              {habit.category}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            {habit.streak > 0 ? (
              <div className="flex items-center gap-0.5 font-medium text-primary">
                <Lucide.Flame className="w-3.5 h-3.5 fill-primary text-primary" />
                <span>{habit.streak}d streak</span>
              </div>
            ) : (
              <span className="text-on-surface-variant/60">No streak yet</span>
            )}

            {habit.linkedObject && (
              <div className="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-md text-[10px] font-medium text-on-surface-variant/80">
                <Lucide.Tag className="w-2.5 h-2.5" />
                <span>{habit.linkedObject} ({habit.linkedObjectType})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion checkbox circular action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(e);
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-150 transform active:scale-90 ${
          habit.completedToday
            ? 'bg-primary-container border-primary-container text-white shadow-sm shadow-primary/25 scale-105'
            : 'border-outline-variant/60 hover:border-primary-container text-transparent'
        }`}
      >
        <Lucide.Check className="w-5 h-5 stroke-[3px]" />
      </button>
    </div>
  );
};
