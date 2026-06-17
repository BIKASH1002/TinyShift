/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Settings, Tag, Sparkles, Check, Edit2, Flame, Award, Heart } from 'lucide-react';
import { Habit } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';

interface HabitDetailScreenProps {
  habit: Habit;
  onClose: () => void;
  onToggleComplete: () => void;
  onEditLinkedTag?: () => void;
}

export const HabitDetailScreen: React.FC<HabitDetailScreenProps> = ({
  habit,
  onClose,
  onToggleComplete,
  onEditLinkedTag,
}) => {
  const [completeState, setCompleteState] = useState(habit.completedToday);

  // Simple animation triggers
  const handleMarkDone = () => {
    setCompleteState(!completeState);
    onToggleComplete();
  };

  // Safe graphic icon mapping
  const renderHabitIllustration = () => {
    let iconBg = 'bg-[#a6e2ff]/30 text-[#24657e]';
    let label = 'water_drop';

    switch (habit.category) {
      case 'Health':
        iconBg = 'bg-[#a6e2ff]/40 text-[#24657e]';
        break;
      case 'Focus':
        iconBg = 'bg-amber-100 text-amber-700';
        break;
      case 'Mood':
        iconBg = 'bg-[#ff9f67]/20 text-[#944a19]';
        break;
      case 'Learning':
        iconBg = 'bg-purple-100 text-purple-700';
        break;
      case 'Movement':
        iconBg = 'bg-emerald-100 text-emerald-800';
        break;
    }

    return (
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-sm ${iconBg}`}>
        {habit.category === 'Health' && <Award className="w-12 h-12 stroke-[1.5px]" />}
        {habit.category === 'Focus' && <Flame className="w-12 h-12 stroke-[1.5px]" />}
        {habit.category === 'Mood' && <Heart className="w-12 h-12 stroke-[1.5px]" />}
        {habit.category === 'Learning' && <Award className="w-12 h-12 stroke-[1.5px]" />}
        {habit.category === 'Movement' && <Flame className="w-12 h-12 stroke-[1.5px]" />}
      </div>
    );
  };

  return (
    <div className="relative min-h-full bg-[#FDFBF7] flex flex-col justify-between overflow-y-auto animate-fade-in pb-32">
      {/* Upper header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-surface-container/60 bg-white/50 backdrop-blur-md sticky top-0 z-30">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>
        <span className="font-display font-extrabold text-lg text-primary">DayTag</span>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-all active:scale-95">
          <Settings className="w-5 h-5 text-on-surface" />
        </button>
      </div>

      {/* Main core segment */}
      <div className="flex-1 px-5 pt-6 max-w-sm mx-auto w-full space-y-6">
        {/* Profile/Habit visual block */}
        <section className="flex flex-col items-center text-center">
          {renderHabitIllustration()}
          
          <h1 className="font-display text-2xl font-black text-on-surface mb-2 tracking-tight">
            {habit.name}
          </h1>

          {habit.linkedObject ? (
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-surface-container rounded-full text-xs font-semibold text-on-surface-variant">
              <Tag className="w-3.5 h-3.5 text-on-surface-variant" />
              <span>Linked to: {habit.linkedObject} ({habit.linkedObjectType})</span>
            </div>
          ) : (
            <span className="text-xs text-on-surface-variant/60 font-medium">No linked tracking tag</span>
          )}
        </section>

        {/* Bento Statistics Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-primary font-display text-3xl font-extrabold leading-none mb-1">
              {completeState ? habit.streak + 1 : habit.streak}
            </span>
            <span className="text-xxs tracking-wider uppercase text-on-surface-variant font-bold">
              Day Streak
            </span>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-tertiary font-display text-3xl font-extrabold leading-none mb-1">
              {habit.weeklyAvg}%
            </span>
            <span className="text-xxs tracking-wider uppercase text-on-surface-variant font-bold">
              Weekly Avg
            </span>
          </div>
        </div>

        {/* Weekly Overviews Bar graph */}
        <section className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm space-y-4">
          <h3 className="font-headline-md text-sm font-extrabold text-on-surface">Weekly Overview</h3>
          <div className="flex items-end justify-between h-24 gap-2 px-1">
            {/* Monday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.M ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">M</span>
            </div>
            {/* Tuesday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.T ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">T</span>
            </div>
            {/* Wednesday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.W || completeState ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-primary font-black">W</span>
            </div>
            {/* Thursday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.T_day ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">T</span>
            </div>
            {/* Friday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.F ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">F</span>
            </div>
            {/* Saturday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.S ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">S</span>
            </div>
            {/* Sunday */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-surface-container-high rounded-full relative h-16">
                <div className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-300 ${habit.weeklyOverview.S_day ? 'bg-secondary h-full' : 'bg-transparent h-0'}`} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/80">S</span>
            </div>
          </div>
        </section>

        {/* Action button triggers */}
        <div className="space-y-3">
          <PrimaryButton
            variant={completeState ? 'outline' : 'primary'}
            onClick={handleMarkDone}
            icon={completeState ? <Check className="w-5 h-5 text-tertiary" /> : <Check className="w-5 h-5" />}
          >
            {completeState ? 'Habit Completed Today!' : 'Mark Done'}
          </PrimaryButton>

          <button
            onClick={onEditLinkedTag}
            className="w-full h-14 border-2 border-outline-variant/60 text-on-surface-variant font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 mb-4 text-xs"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Linked Tag</span>
          </button>
        </div>

        {/* AI micro-recommendation box */}
        {habit.aiSuggestion && (
          <div className="relative overflow-hidden p-5 rounded-3xl border border-tertiary-container/30 bg-tertiary-container/10 flex items-start gap-4">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-tertiary-container/15 rounded-full blur-2xl" />
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary shadow-sm z-10 animate-pulse">
              <Sparkles className="w-5 h-5 fill-tertiary/10" />
            </div>
            <div className="z-10 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold block">
                AI Suggestion
              </span>
              <p className="font-body-md text-xs leading-relaxed text-on-surface font-medium">
                {habit.aiSuggestion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
