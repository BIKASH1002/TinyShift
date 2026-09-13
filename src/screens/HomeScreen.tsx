import React, { useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Habit, CompletionMode } from '../types';
import { HabitCard } from '../components/HabitCard';
import { ProgressCard } from '../components/ProgressCard';
import { EmptyState } from '../components/EmptyState';
interface Props {
  habits: Habit[];
  onComplete: (id: string, mode: CompletionMode) => void;
  onRescue: (id?: string) => void;
  onAddHabitClick: () => void;
  errorMessage?: string | null;
}
export const HomeScreen: React.FC<Props> = ({
  habits,
  onComplete,
  onRescue,
  onAddHabitClick,
  errorMessage,
}) => {
  const completed = useMemo(() => habits.filter((h) => h.completedToday).length, [habits]);
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-5 pb-32 overflow-y-auto space-y-5">
      <header className="flex justify-between">
        <div>
          <h1 className="text-xl font-black text-primary">TinyShift</h1>
          <p className="text-xs text-on-surface-variant">{date}</p>
        </div>
        <button
          onClick={onAddHabitClick}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>
      <section className="bg-[#2D3436] text-white p-5 rounded-3xl">
        <div className="flex gap-2 items-center text-[#ccf078]">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Today's intention
          </span>
        </div>
        <h2 className="font-bold text-lg mt-2">Consistency can be small.</h2>
        <p className="text-xs opacity-70 mt-1">
          Do the full version when you can. Use the tiny version when life gets in the way.
        </p>
      </section>
      <ProgressCard
        completedCount={completed}
        totalCount={habits.length}
        streak={Math.max(0, ...habits.map((h) => h.streak))}
      />
      {errorMessage && (
        <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">{errorMessage}</p>
      )}
      <div className="space-y-3">
        {habits.length ? (
          habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onComplete={(m) => onComplete(h.id, m)}
              onRescue={() => onRescue(h.id)}
            />
          ))
        ) : (
          <EmptyState
            icon="Sprout"
            title="Start with one tiny shift"
            description="Choose a behavior and attach it to a moment already in your day."
            actionText="Create your first habit"
            onActionClick={onAddHabitClick}
          />
        )}
      </div>
    </div>
  );
};
