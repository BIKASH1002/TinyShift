/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Bell, Calendar as CalIcon, QrCode } from 'lucide-react';
import { Habit } from '../types';
import { HabitCard } from '../components/HabitCard';
import { ProgressCard } from '../components/ProgressCard';
import { EmptyState } from '../components/EmptyState';

interface HomeScreenProps {
  habits: Habit[];
  onToggleComplete: (id: string) => void;
  onViewDetails: (habit: Habit) => void;
  onAddHabitClick: () => void;
  userRoutineSegment?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  habits,
  onToggleComplete,
  onViewDetails,
  onAddHabitClick,
  userRoutineSegment = 'morning',
}) => {
  const [activeSegmentFilter, setActiveSegmentFilter] = useState<'All' | 'Health' | 'Focus' | 'Mood' | 'Learning'>('All');

  // Days of the week representing active row status
  const weekDays = [
    { label: 'M', dateNum: 15, active: true, checked: true },
    { label: 'T', dateNum: 16, active: true, checked: true },
    { label: 'W', dateNum: 17, active: true, checked: false, isToday: true }, // 17th is today in prompt metadata
    { label: 'T', dateNum: 18, active: false, checked: false },
    { label: 'F', dateNum: 19, active: false, checked: false },
    { label: 'S', dateNum: 20, active: false, checked: false },
    { label: 'S', dateNum: 21, active: false, checked: false },
  ];

  // Filtering habits based on selecting buttons
  const filteredHabits = useMemo(() => {
    if (activeSegmentFilter === 'All') return habits;
    return habits.filter((h) => h.category === activeSegmentFilter);
  }, [habits, activeSegmentFilter]);

  // Track progress counts
  const progressMetrics = useMemo(() => {
    const total = filteredHabits.length;
    const completed = filteredHabits.filter((h) => h.completedToday).length;
    return { total, completed };
  }, [filteredHabits]);

  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-4 pb-32 overflow-y-auto animate-fade-in space-y-6">
      {/* Dynamic welcome header with avatar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
              alt="Ananya headshot"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="font-headline-md text-base text-on-surface font-bold leading-tight">
              Hello, Ananya
            </h2>
            <p className="text-xxs text-primary font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-container fill-primary" />
              <span>Routine refreshed 2h ago</span>
            </p>
          </div>
        </div>
        
        {/* Header control triggers */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddHabitClick}
            className="w-10 h-10 bg-primary-container/10 p-2 text-primary rounded-full hover:bg-primary-container/20 transition-all flex items-center justify-center active:scale-95"
            title="Create Habit"
          >
            <Plus className="w-5 h-5 stroke-[2.5px]" />
          </button>
        </div>
      </div>

      {/* Week Calendar Row */}
      <div className="bg-white p-3.5 rounded-3xl border border-surface-container flex justify-between items-center gap-1">
        {weekDays.map((wd, i) => (
          <div
            key={i}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl flex-1 text-center transition-all ${
              wd.isToday
                ? 'bg-primary-container text-on-primary-container shadow-sm scale-110'
                : 'bg-transparent text-on-surface-variant'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 leading-none mb-1">
              {wd.label}
            </span>
            <span className="text-sm font-extrabold leading-none">{wd.dateNum}</span>
            <div
              className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                wd.checked
                  ? wd.isToday ? 'bg-white' : 'bg-primary'
                  : 'bg-transparent border border-outline-variant/30'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Progress Card Section */}
      <ProgressCard
        completedCount={progressMetrics.completed}
        totalCount={progressMetrics.total}
        streak={14} // Ananya's routine streak
      />

      {/* Category Selection Carousel */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">Segment focus</span>
          <span className="text-xxs text-primary font-medium">Auto-synced</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {(['All', 'Health', 'Focus', 'Mood', 'Learning'] as const).map((seg) => {
            const isActive = activeSegmentFilter === seg;
            return (
              <button
                key={seg}
                onClick={() => setActiveSegmentFilter(seg)}
                className={`flex-shrink-0 px-4 py-2.5 h-10 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container/60 hover:bg-surface-container text-on-surface'
                }`}
              >
                {seg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Habit Cards Listing */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">
            {activeSegmentFilter} Habits
          </span>
          <span className="text-xxs text-on-surface-variant/60">{filteredHabits.length} items</span>
        </div>

        {filteredHabits.length > 0 ? (
          <div className="space-y-2.5">
            {filteredHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggleComplete={() => onToggleComplete(habit.id)}
                onViewDetails={() => onViewDetails(habit)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="Compass"
            title="A fresh canvas!"
            description={`No habits in this ${activeSegmentFilter} segment yet. Add an exciting new tag to start tracking.`}
            actionText="Add Habit"
            onActionClick={onAddHabitClick}
          />
        )}
      </div>
    </div>
  );
};
