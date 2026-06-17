/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QrCode, Sparkles, Smartphone } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onSeeHowItWorks: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onGetStarted,
  onSeeHowItWorks,
}) => {
  return (
    <div className="relative min-h-full flex flex-col justify-between p-6 bg-[#FDFBF7] overflow-y-auto animate-fade-in pb-12">
      {/* Decorative top ambient blur or gradients */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 left-[-100px] w-64 h-64 bg-[#a6e2ff]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Illustrative Image block */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div className="relative w-full max-w-sm aspect-square rounded-[36px] overflow-hidden shadow-2xl shadow-primary/5 transition-transform duration-500 hover:scale-[1.01] group">
          {/* Main Hero Photograph representing Sunrise Warmth */}
          <img
            src="https://images.unsplash.com/photo-1517256064527-09c53b2d0ec6?auto=format&fit=crop&w=600&q=80"
            alt="Mindful Morning Coffee Setting"
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
          />
          
          {/* Floating UI Overlays */}
          <div className="absolute top-4 left-4 bg-white/75 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/20 animate-bounce" style={{ animationDuration: '4s' }}>
            <Sparkles className="w-4 h-4 text-tertiary fill-tertiary/10" />
            <span className="text-[11px] font-bold text-on-surface tracking-tight">AI Suggestion: Hydrate</span>
          </div>

          <div className="absolute bottom-4 right-4 bg-white/75 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/20">
            <QrCode className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-on-surface tracking-tight">Tag: Morning Coffee</span>
          </div>
        </div>
      </div>

      {/* Narrative block */}
      <div className="space-y-6 text-center max-w-sm mx-auto">
        <div className="space-y-2">
          <h1 className="font-display text-4xl text-primary font-extrabold tracking-tight">
            DayTag
          </h1>
          <p className="font-headline-md text-xl md:text-2xl text-on-surface font-semibold leading-tight">
            Refresh your routine, one small moment at a time.
          </p>
        </div>

        <p className="font-body-md text-sm md:text-base text-on-surface-variant leading-relaxed max-w-xs mx-auto">
          Track habits by scanning daily objects and discover AI-powered suggestions to keep your day fresh.
        </p>

        {/* Action button triggers */}
        <div className="space-y-2 pt-4">
          <PrimaryButton variant="primary" onClick={onGetStarted}>
            Get Started
          </PrimaryButton>
          <button
            onClick={onSeeHowItWorks}
            className="w-full h-14 text-sm text-primary font-bold hover:bg-orange-50/20 active:scale-[0.98] transition-all rounded-2xl"
          >
            See How It Works
          </button>
        </div>
      </div>
    </div>
  );
};
