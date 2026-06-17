/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, User, Flame, QrCode, TrendingUp, Calendar, Bell, Tag, Sparkles, Lock, LogOut, Check } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onLogout,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState(profile.name);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerMockSettingMessage = (title: string) => {
    setToastMessage(`Setting updated: ${title}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSaveName = () => {
    setEditingName(false);
    onUpdateProfile({ name: userName });
    triggerMockSettingMessage(`Name updated to "${userName}"`);
  };

  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-4 pb-32 overflow-y-auto animate-fade-in space-y-6 relative">
      {/* Toast settings configurations */}
      {toastMessage && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-inverse-surface/95 text-inverse-on-surface px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg text-xs leading-relaxed transition-all slide-up">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="flex-1 font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-center">
        <h1 className="font-display font-black text-xl text-primary leading-tight">DayTag</h1>
        <button
          onClick={() => triggerMockSettingMessage("System Preferences")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface transition-all active:scale-95"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Header card banner */}
      <section className="flex flex-col items-center text-center space-y-3 pt-2">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl shadow-primary/5 transition-transform duration-300 group-hover:scale-105">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Subtle edit emblem overlay */}
          <button
            onClick={() => {
              const newName = prompt("Enter your new profile name:", userName);
              if (newName && newName.trim()) {
                setUserName(newName.trim());
                onUpdateProfile({ name: newName.trim() });
                triggerMockSettingMessage(`Avatar label updated!`);
              }
            }}
            className="absolute bottom-1 right-1 bg-primary-container p-2 rounded-full border-2 border-white text-on-primary-container shadow-md hover:scale-110 active:scale-90 transition-all cursor-pointer"
          >
            <User className="w-3.5 h-3.5 stroke-[2.5px]" />
          </button>
        </div>

        {/* User identification */}
        <div className="space-y-1 w-full flex flex-col items-center">
          {editingName ? (
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-white px-3 py-1.5 border border-primary rounded-xl text-center font-bold text-on-surface text-base focus:outline-none"
                maxLength={16}
              />
              <button onClick={handleSaveName} className="p-2 bg-primary text-white rounded-xl text-xs font-bold active:scale-95">
                Save
              </button>
            </div>
          ) : (
            <h2
              onClick={() => setEditingName(true)}
              className="font-display text-2xl font-black text-on-surface tracking-tight hover:text-primary cursor-pointer transition-colors"
              title="Click to rename"
            >
              {profile.name}
            </h2>
          )}

          {/* Routine streak identifier badge */}
          <div className="flex items-center gap-1 bg-[#ccf078]/25 text-[#4d6700] px-4 py-1.5 rounded-full border border-[#ccf078]/40 text-xs font-bold shadow-sm">
            <Flame className="w-4 h-4 fill-[#4d6700] text-[#4d6700]" />
            <span>{profile.routineStreak} Day Routine Streak</span>
          </div>
        </div>
      </section>

      {/* Asymmetric Stats Overview cards */}
      <section className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto w-full">
        {/* Connected tags card */}
        <div
          onClick={() => triggerMockSettingMessage("Active NFC & QR Tags")}
          className="p-5 rounded-3xl bg-surface-container-highest flex flex-col justify-between aspect-square cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs active:scale-95"
        >
          <QrCode className="w-6 h-6 text-primary" />
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/80">Connected Tags</p>
            <p className="font-headline-md text-base md:text-lg text-on-surface font-black">{profile.connectedTagsCount} Active</p>
          </div>
        </div>

        {/* Efficiency index stats */}
        <div
          onClick={() => triggerMockSettingMessage("Efficiency calculations")}
          className="p-5 rounded-3xl bg-[#a6e2ff]/20 border border-[#a6e2ff]/30 flex flex-col justify-between aspect-square cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs active:scale-95"
        >
          <TrendingUp className="w-6 h-6 text-secondary" />
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/80">Efficiency</p>
            <p className="font-headline-md text-base md:text-lg text-on-surface font-black">{profile.efficiency}%</p>
          </div>
        </div>
      </section>

      {/* Preferences items list */}
      <section className="max-w-sm mx-auto w-full space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80 px-1">
          PREFERENCES
        </h3>
        
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-surface-container divide-y divide-surface-container">
          {/* Routine Preferences */}
          <button
            onClick={() => triggerMockSettingMessage("Routine preference defaults")}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Calendar className="w-5 h-5 stroke-2" />
              </div>
              <span className="font-semibold text-sm text-on-surface">Routine Preferences</span>
            </div>
            <span className="text-outline-variant group-hover:translate-x-1 transition-transform text-xs font-extrabold">▶</span>
          </button>

          {/* Notification settings */}
          <button
            onClick={() => triggerMockSettingMessage("Notification settings")}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Bell className="w-5 h-5 stroke-2" />
              </div>
              <span className="font-semibold text-sm text-on-surface">Notification Settings</span>
            </div>
            <span className="text-outline-variant group-hover:translate-x-1 transition-transform text-xs font-extrabold">▶</span>
          </button>

          {/* Connected physical tags detail */}
          <button
            onClick={() => triggerMockSettingMessage("Linked object hardware cards")}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-2xl bg-[#ccf078]/30 flex items-center justify-center text-[#4d6700]">
                <Tag className="w-5 h-5 stroke-2" />
              </div>
              <div>
                <span className="block font-semibold text-sm text-on-surface">Connected Tags</span>
                <span className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{profile.connectedTagsCount} Tags Linked</span>
              </div>
            </div>
            <span className="text-outline-variant group-hover:translate-x-1 transition-transform text-xs font-extrabold">▶</span>
          </button>

          {/* AI suggestion options */}
          <button
            onClick={() => triggerMockSettingMessage("AI Suggestion prompt customization")}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5 stroke-2" />
              </div>
              <span className="font-semibold text-sm text-on-surface">AI Suggestion Preferences</span>
            </div>
            <span className="text-outline-variant group-hover:translate-x-1 transition-transform text-xs font-extrabold">▶</span>
          </button>
        </div>
      </section>

      {/* Safety & Legal Note banner */}
      <section className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/30 flex items-start gap-3.5 max-w-sm mx-auto w-full relative overflow-hidden">
        <Lock className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
        <p className="font-body-md text-xs leading-relaxed text-on-surface-variant font-medium">
          Your routine data stays private and in your control. We encrypt all tag interactions locally on your physical device.
        </p>
      </section>

      {/* Final Sign out control trigger */}
      <div className="max-w-sm mx-auto w-full pt-1 pb-4">
        <button
          onClick={onLogout}
          className="w-full py-4 rounded-2xl font-bold text-sm text-error bg-rose-50/40 hover:bg-rose-50 border border-rose-100 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4 stroke-[2.5px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
