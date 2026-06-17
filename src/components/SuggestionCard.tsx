/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Lucide from 'lucide-react';
import { RefreshSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: RefreshSuggestion;
  onTryToday: () => void;
  onNotForMe: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onTryToday,
  onNotForMe,
}) => {
  // Safe icon lookup
  const IconComponent = (Lucide[suggestion.icon as keyof typeof Lucide] || Lucide.Sparkles) as React.ComponentType<{ className?: string }>;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-surface-container overflow-hidden transition-all duration-300 hover:shadow-md animate-fade-in">
      {/* Banner Image if provided */}
      {suggestion.image && (
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={suggestion.image}
            alt={suggestion.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white font-semibold text-sm">
            {IconComponent && <IconComponent className="w-4 h-4 text-primary-container fill-primary-container" />}
            <span className="tracking-wide uppercase text-xs">{suggestion.category}</span>
          </div>
        </div>
      )}

      {/* Suggestion Body */}
      <div className="p-5 space-y-4">
        {/* Suggestion title if there's no image or header block */}
        {!suggestion.image && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-tertiary-container/15 flex items-center justify-center text-tertiary">
              {IconComponent && <IconComponent className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-tertiary px-2 py-0.5 bg-tertiary-container/10 rounded-full">
                {suggestion.category}
              </span>
              <h3 className="font-headline-md text-base text-on-surface font-semibold mt-0.5">{suggestion.title}</h3>
            </div>
          </div>
        )}

        {suggestion.image && (
          <h3 className="font-headline-md text-lg text-on-surface font-bold tracking-tight">
            {suggestion.title}
          </h3>
        )}

        <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
          <span className="font-bold text-primary">Reason:</span> {suggestion.reason}
        </p>

        {/* Form CTA Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onTryToday}
            className="flex-1 h-12 bg-primary-container text-on-primary-container font-semibold rounded-2xl text-xs transition-transform active:scale-95 shadow-sm shadow-primary/10 flex items-center justify-center gap-1.5 hover:brightness-105"
          >
            <Lucide.Check className="w-4 h-4" />
            <span>Try Today</span>
          </button>
          <button
            onClick={onNotForMe}
            className="px-5 h-12 border-2 border-outline-variant/60 text-on-surface-variant font-semibold rounded-2xl text-xs transition-all active:scale-95 hover:bg-surface-container-low"
          >
            Not for Me
          </button>
        </div>
      </div>
    </div>
  );
};
