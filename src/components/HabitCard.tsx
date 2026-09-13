import React from 'react';
import * as Lucide from 'lucide-react';
import { Habit } from '../types';
interface Props {
  habit: Habit;
  onComplete: (mode: 'normal' | 'minimum') => void;
  onRescue: () => void;
}
export const HabitCard: React.FC<Props> = ({ habit, onComplete, onRescue }) => {
  const Icon = (Lucide[habit.icon as keyof typeof Lucide] || Lucide.Sprout) as React.ComponentType<{
    className?: string;
  }>;
  const done = habit.statusToday === 'done';
  return (
    <article
      className={`bg-white rounded-3xl p-5 border shadow-sm ${done ? 'border-emerald-200' : 'border-surface-container'}`}
    >
      <div className="flex gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary-container/15 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between gap-2">
            <h3 className={`font-bold ${done ? 'line-through opacity-60' : ''}`}>{habit.name}</h3>
            <span className="text-[9px] uppercase font-bold text-on-surface-variant">
              {habit.category}
            </span>
          </div>
          <p className="text-[11px] text-primary mt-1">{habit.anchor}</p>
          <p className="text-xs text-on-surface-variant mt-2">
            {done
              ? habit.completionMode === 'minimum'
                ? 'Tiny version completed'
                : 'Completed today'
              : habit.normalVersion}
          </p>
        </div>
      </div>
      {!done && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => onComplete('normal')}
            className="py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Done
          </button>
          <button
            onClick={onRescue}
            className="py-2.5 rounded-xl bg-orange-50 text-primary text-xs font-bold border border-orange-100"
          >
            Make it easier
          </button>
        </div>
      )}
    </article>
  );
};
