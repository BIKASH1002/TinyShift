/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, Code, Heart, Moon, Smile, ArrowRight, UserCheck } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';

interface LoginScreenProps {
  onLoginSuccess: (selectedRoutine: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const OPTIONS = [
    {
      id: 'morning',
      title: 'Morning routine',
      description: 'Energize your first hours',
      icon: Sun,
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'work',
      title: 'Work or study',
      description: 'Focus & productivity flow',
      icon: Code,
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'health',
      title: 'Health & Wellness',
      description: 'Care for your body and mind',
      icon: Heart,
      iconBg: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'evening',
      title: 'Evening wind-down',
      description: 'Unplug and rest deeply',
      icon: Moon,
      iconBg: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'mood',
      title: 'Mood check-ins',
      description: 'Track your emotional rhythm',
      icon: Smile,
      iconBg: 'bg-orange-100 text-orange-700',
    },
  ];

  return (
    <div className="relative min-h-full flex flex-col justify-between p-6 bg-[#FDFBF7] overflow-y-auto animate-fade-in pb-28">
      {/* Upper header */}
      <div className="text-center md:text-left pt-2 pb-6">
        <h2 className="font-headline-lg-mobile text-2xl font-bold text-primary mb-2">
          Let's start small.
        </h2>
        <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-sm mx-auto md:mx-0 leading-relaxed">
          What part of your day feels most repetitive? Select one to initialize your focus.
        </p>
      </div>

      {/* Selector Cards Grid */}
      <div className="space-y-3 max-w-sm mx-auto w-full">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`w-full flex items-center p-4 rounded-3xl text-left border-2 transition-all duration-150 relative active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? 'border-primary bg-white shadow-md scale-[1.01]'
                  : 'border-transparent bg-white hover:shadow-sm'
              }`}
            >
              {/* Routine Icon wrapper */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0 ${opt.iconBg}`}>
                <Icon className="w-6 h-6 stroke-2" />
              </div>

              {/* Descriptions */}
              <div className="flex-1 min-w-0 pr-4">
                <span className="font-headline-md text-sm md:text-base text-on-surface block font-bold leading-tight">
                  {opt.title}
                </span>
                <span className="font-label-sm text-xxs md:text-xs text-on-surface-variant/80 block mt-0.5 mt-0.5 truncate">
                  {opt.description}
                </span>
              </div>

              {/* Selector accessory */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-primary bg-primary text-white' : 'border-outline-variant/50'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom atmospheric photo & trigger button */}
      <div className="mt-6 max-w-sm mx-auto w-full space-y-4">
        {/* Desk Setting Image */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80"
            alt="Sunny journal setting"
            className="w-full h-full object-cover select-none brightness-[0.93]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        {/* CTA triggers */}
        <PrimaryButton
          variant="secondary"
          disabled={!selected}
          onClick={() => {
            if (selected) {
              onLoginSuccess(selected);
            }
          }}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
};
