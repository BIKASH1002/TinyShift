/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Settings, HelpCircle, Check, Info } from 'lucide-react';
import { RefreshSuggestion, Habit } from '../types';
import { SuggestionCard } from '../components/SuggestionCard';

interface RefreshScreenProps {
  suggestions: RefreshSuggestion[];
  onAddCustomSuggestedHabit: (title: string, category: string, reason: string) => void;
}

export const RefreshScreen: React.FC<RefreshScreenProps> = ({
  suggestions: initialSuggestions,
  onAddCustomSuggestedHabit,
}) => {
  const [suggestionList, setSuggestionList] = useState<RefreshSuggestion[]>(initialSuggestions);
  const [notification, setNotification] = useState<string | null>(null);

  const handleTryToday = (sug: RefreshSuggestion) => {
    // Add custom suggested habit
    onAddCustomSuggestedHabit(
      sug.title,
      sug.category === 'Atmosphere' ? 'Mood' : sug.category === 'Sunlight' ? 'Health' : 'Focus',
      sug.reason
    );

    // Trigger celebration banner
    setNotification(`"${sug.title}" added to your Habits today!`);
    
    // Smoothly remove item from recommendations carousel representation
    setSuggestionList((prev) => prev.filter((item) => item.id !== sug.id));

    setTimeout(() => {
      setNotification(null);
    }, 2800);
  };

  const handleNotForMe = (id: string, name: string) => {
    setSuggestionList((prev) => prev.filter((item) => item.id !== id));
    setNotification(`Archived recommendation: "${name}"`);
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-4 pb-32 overflow-y-auto animate-fade-in space-y-6 relative">
      {/* Toast Feedback Notification */}
      {notification && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-inverse-surface/95 text-inverse-on-surface px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg text-xs leading-relaxed transition-all slide-up">
          <Sparkles className="w-5 h-5 text-primary-container fill-primary-container" />
          <span className="flex-1 font-medium">{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
              alt="Ananya profile tiny"
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

      {/* Prompt header details */}
      <section className="space-y-1">
        <h1 className="font-headline-lg-mobile text-xl md:text-2xl font-bold text-on-surface tracking-tight">
          Refresh Suggestions
        </h1>
        <p className="text-xs font-body-md text-on-surface-variant font-medium leading-relaxed">
          Small changes designed by DayTag AI to break weekly monotony.
        </p>
      </section>

      {/* Suggestion Lists list */}
      <div className="space-y-5 max-w-sm mx-auto w-full">
        {suggestionList.length > 0 ? (
          suggestionList.map((sug) => (
            <SuggestionCard
              key={sug.id}
              suggestion={sug}
              onTryToday={() => handleTryToday(sug)}
              onNotForMe={() => handleNotForMe(sug.id, sug.title)}
            />
          ))
        ) : (
          <div className="bg-white rounded-3xl p-6 text-center border border-surface-container py-12 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <Check className="w-7 h-7 stroke-[2.5px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-on-surface">Up-to-Date!</h3>
              <p className="text-xs text-on-surface-variant max-w-[200px] leading-relaxed mx-auto font-medium">
                You adopted or cleared all daily behavior suggestions. Check back tomorrow!
              </p>
            </div>
          </div>
        )}

        {/* Insight context badge block */}
        <div className="bg-secondary-container/20 border border-secondary-container/30 p-5 rounded-3xl flex items-start gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-[#a6e2ff]/10 rounded-full blur-xl" />
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1 z-10">
            <h3 className="text-xxs tracking-wider uppercase font-extrabold text-secondary">Did you know?</h3>
            <p className="font-body-md text-xs leading-relaxed text-on-secondary-container/90">
              Small novelties in your household trigger key dopamine releases, restoring high focus levels and reducing routine fatigue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
