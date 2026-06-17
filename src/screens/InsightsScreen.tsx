/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Sun, Activity, Moon, Save, Check, Settings, MessageSquare } from 'lucide-react';
import { WeeklyInsight } from '../types';
import { InsightCard } from '../components/InsightCard';
import { PrimaryButton } from '../components/PrimaryButton';

interface InsightsScreenProps {
  insights: WeeklyInsight[];
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ insights }) => {
  const [reflection, setReflection] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleSaveReflection = () => {
    setIsSaved(true);
    setSaveToast("Reflection saved successfully!");
    setTimeout(() => {
      setSaveToast(null);
    }, 2800);
  };

  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-4 pb-32 overflow-y-auto animate-fade-in space-y-6 relative">
      {/* Toast Saved notifications */}
      {saveToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-inverse-surface/95 text-inverse-on-surface px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg text-xs leading-relaxed transition-all slide-up">
          <Check className="w-5 h-5 text-[#ccf078]" />
          <span className="flex-1 font-medium">{saveToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
              alt="Ananya profile small picture"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-extrabold text-lg text-primary">DayTag</h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Hero headline description */}
      <section className="space-y-1">
        <h1 className="font-headline-lg-mobile text-xl md:text-2xl font-bold text-on-surface tracking-tight animate-fade-in-up">
          Your Week in Small Wins
        </h1>
        <p className="text-xs font-body-md text-on-surface-variant font-medium leading-relaxed opacity-85">
          Reflect on your journey toward a calmer, better version of you.
        </p>
      </section>

      {/* Bento Grid layout representing small metrics wins */}
      <section className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto w-full">
        {insights.map((ins) => (
          <InsightCard key={ins.id} insight={ins} />
        ))}
        {/* Ad hoc "skipped" card to perfectly capture screenshot design */}
        <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm flex flex-col items-center justify-center text-center gap-3 transition-transform duration-200 hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-50 text-rose-600">
            <Moon className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="font-headline-md text-base text-on-surface font-bold block line-clamp-1">
              Evening Walk
            </span>
            <p className="font-label-sm text-xxs tracking-wide uppercase text-on-surface-variant font-semibold">
              Most skipped
            </p>
          </div>
        </div>
      </section>

      {/* Daily Consistency Chart wrapper */}
      <section className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm max-w-sm mx-auto w-full space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-md text-sm font-extrabold text-on-surface">Daily Consistency</h3>
          <span className="text-[10px] font-bold text-primary bg-primary-container/15 px-3 py-1 rounded-full uppercase tracking-wider">
            Weekly Streak: 5
          </span>
        </div>

        {/* Bar layout indicators */}
        <div className="h-28 flex items-end justify-between gap-2 px-1">
          {/* Mon */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-surface-container rounded-t-full h-14 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">MON</span>
          </div>
          {/* Tue */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-surface-container rounded-t-full h-10 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">TUE</span>
          </div>
          {/* Wed - 90% peak */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-secondary-container rounded-t-full relative h-[78px] transition-all duration-500">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xxs font-black text-secondary">90%</div>
            </div>
            <span className="text-[9px] font-black text-secondary">WED</span>
          </div>
          {/* Thu */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-surface-container rounded-t-full h-16 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">THU</span>
          </div>
          {/* Fri */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-[#ccf078]/30 rounded-t-full h-20 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">FRI</span>
          </div>
          {/* Sat */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-surface-container rounded-t-full h-8 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">SAT</span>
          </div>
          {/* Sun */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-surface-container rounded-t-full h-12 transition-all duration-500" />
            <span className="text-[9px] font-bold text-on-surface-variant/70">SUN</span>
          </div>
        </div>
      </section>

      {/* Reflection edit fields */}
      <section className="max-w-sm mx-auto w-full space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-5 bg-primary-container rounded-full" />
          <h3 className="font-headline-md text-sm font-extrabold text-on-surface leading-tight">
            What made your routine feel better this week?
          </h3>
        </div>

        <div className="relative group">
          <textarea
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              if (isSaved) setIsSaved(false);
            }}
            className="w-full min-h-[140px] bg-[#F5F2ED] rounded-3xl p-5 border-none outline-none focus:ring-2 focus:ring-primary-container text-xs md:text-sm text-on-surface placeholder:text-outline-variant leading-relaxed resize-none transition-all pr-12 scrollbar-none"
            placeholder="I felt really grounded on Wednesday when I took my coffee outside..."
          />
          {!reflection && (
            <div className="absolute bottom-4 right-4 text-outline-variant text-[11px] font-semibold pointer-events-none group-focus-within:opacity-0 transition-opacity flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Tap to write reflections</span>
            </div>
          )}
        </div>
      </section>

      {/* Save trigger button */}
      <div className="max-w-sm mx-auto w-full pt-1 pb-4">
        <PrimaryButton
          variant={isSaved ? 'outline' : 'primary'}
          onClick={handleSaveReflection}
          icon={isSaved ? <Check className="w-5 h-5 text-tertiary" /> : <Save className="w-5 h-5" />}
        >
          {isSaved ? 'Reflection Saved!' : 'Save Reflection'}
        </PrimaryButton>
        <p className="text-center text-[10px] text-on-surface-variant/50 uppercase font-black tracking-widest mt-3.5">
          Small physical reflections lead to big lifetime changes.
        </p>
      </div>
    </div>
  );
};
