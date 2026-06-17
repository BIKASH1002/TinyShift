/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, User, QrCode, Smartphone, Sparkles, Check } from 'lucide-react';
import { HabitCategory, HabitFrequency, Habit } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';

interface AddHabitScreenProps {
  onAddHabit: (habitData: Partial<Habit>) => void;
  onClose: () => void;
}

export const AddHabitScreen: React.FC<AddHabitScreenProps> = ({
  onAddHabit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Health');
  const [frequency, setFrequency] = useState<HabitFrequency>('Daily');
  const [linkedObjectType, setLinkedObjectType] = useState<'NFC' | 'QR' | null>(null);

  const CATEGORIES: HabitCategory[] = ['Health', 'Focus', 'Mood', 'Learning', 'Movement'];
  const FREQUENCIES: HabitFrequency[] = ['Daily', 'Weekdays', 'Custom'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Build the dynamic habit object
    const newHabit: Partial<Habit> = {
      name: name.trim(),
      category,
      frequency,
      streak: 0,
      weeklyAvg: 40,
      linkedObject: linkedObjectType ? (linkedObjectType === 'NFC' ? 'Ambient NFC Disc' : 'Smart Stick Sticker') : null,
      linkedObjectType,
      completedToday: false,
      icon: category === 'Health' ? 'Droplet' : category === 'Focus' ? 'BookOpen' : category === 'Mood' ? 'Smile' : category === 'Learning' ? 'Compass' : 'Sparkles',
      weeklyOverview: {
        M: false,
        T: false,
        W: false,
        T_day: false,
        F: false,
        S: false,
        S_day: false,
      }
    };

    onAddHabit(newHabit);
  };

  return (
    <div className="relative min-h-full bg-[#FDFBF7] flex flex-col justify-between overflow-y-auto animate-fade-in pb-32">
      {/* Absolute Decorative elements */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 -ml-12 w-48 h-48 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-surface-container/60 bg-white/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-on-surface" />
          </button>
          <h1 className="font-headline-md text-base md:text-lg font-bold text-primary">New Habit</h1>
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
            alt="Ananya profile tiny"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Main input layout block */}
      <form onSubmit={handleSubmit} className="px-5 pt-6 space-y-6 flex-1 max-w-sm mx-auto w-full">
        {/* Input box */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest text-on-surface-variant/80 uppercase px-1">
            HABIT NAME
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's the new habit?"
            className="w-full h-16 bg-[#F5F2ED] rounded-2xl px-6 font-semibold text-lg text-on-surface placeholder:text-outline/80 border-none outline-none focus:ring-2 focus:ring-primary-container transition-all"
          />
        </div>

        {/* Category Choice */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest text-on-surface-variant/80 uppercase px-1">
            Category
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-extrabold shadow-sm'
                      : 'bg-surface-container/60 hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequencies selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest text-on-surface-variant/80 uppercase px-1">
            FREQUENCY
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FREQUENCIES.map((freq) => {
              const isActive = frequency === freq;
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-3.5 rounded-2xl text-xs font-semibold transition-all duration-150 active:scale-95 text-center cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-extrabold shadow-sm'
                      : 'bg-surface-container/60 hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {freq}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connection Profiles section */}
        <div className="space-y-3 pt-2">
          <div className="space-y-0.5">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant/80 uppercase px-1">
              TANGIBLE TRACKING
            </label>
            <p className="text-[11px] text-on-surface-variant/60 px-1 font-medium">Link this habit to a physical sticker or object.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* QR block tile */}
            <button
              type="button"
              onClick={() => setLinkedObjectType(linkedObjectType === 'QR' ? null : 'QR')}
              className={`p-4 rounded-3xl flex items-center justify-between gap-4 text-left border-2 transition-all duration-150 active:scale-[0.99] cursor-pointer bg-white ${
                linkedObjectType === 'QR' ? 'border-primary shadow-md' : 'border-surface-container hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-primary flex-shrink-0">
                  <QrCode className="w-6 h-6 stroke-2" />
                </div>
                <div>
                  <h3 className="font-headline-md text-sm text-on-surface font-bold leading-tight">Generate QR Code</h3>
                  <p className="font-body-md text-xxs text-on-surface-variant/70 mt-0.5 mt-0.5">Print paper tags to stick anywhere</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                linkedObjectType === 'QR' ? 'bg-primary border-primary text-white' : 'border-outline-variant/50'
              }`}>
                {linkedObjectType === 'QR' && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
              </div>
            </button>

            {/* NFC block tile */}
            <button
              type="button"
              onClick={() => setLinkedObjectType(linkedObjectType === 'NFC' ? null : 'NFC')}
              className={`p-4 rounded-3xl flex items-center justify-between gap-4 text-left border-2 transition-all duration-150 active:scale-[0.99] cursor-pointer bg-white ${
                linkedObjectType === 'NFC' ? 'border-primary shadow-md' : 'border-surface-container hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#a6e2ff]/30 flex items-center justify-center text-secondary flex-shrink-0">
                  <Smartphone className="w-6 h-6 stroke-2" />
                </div>
                <div>
                  <h3 className="font-headline-md text-sm text-on-surface font-bold leading-tight">Link NFC Tag</h3>
                  <p className="font-body-md text-xxs text-on-surface-variant/70 mt-0.5 mt-0.5">Scan disk keytags with phone receiver</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                linkedObjectType === 'NFC' ? 'bg-primary border-primary text-white' : 'border-outline-variant/50'
              }`}>
                {linkedObjectType === 'NFC' && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
              </div>
            </button>
          </div>
        </div>
      </form>

      {/* Button floating layout */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent pt-10 pb-8 sticky z-30 border-t border-surface-container/20 flex justify-center">
        <PrimaryButton
          variant={name.trim() ? 'secondary' : 'outline'}
          disabled={!name.trim()}
          onClick={handleSubmit}
          icon={<Check className="w-5 h-5" />}
          className="max-w-sm shadow-xl shadow-primary/10"
        >
          Create Habit
        </PrimaryButton>
      </div>
    </div>
  );
};
