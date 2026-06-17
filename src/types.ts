/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HabitCategory = 'Health' | 'Focus' | 'Mood' | 'Learning' | 'Movement';

export type HabitFrequency = 'Daily' | 'Weekdays' | 'Custom';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  streak: number;
  weeklyAvg: number; // e.g. 85 for 85%
  linkedObject: string | null; // e.g. 'Water Bottle'
  linkedObjectType?: 'NFC' | 'QR' | null;
  completedToday: boolean;
  icon: string; // Lucide icon string representation
  weeklyOverview: {
    M: boolean;
    T: boolean;
    W: boolean;
    T_day: boolean; // avoiding clash with TypeScript key words
    F: boolean;
    S: boolean;
    S_day: boolean;
  };
  aiSuggestion?: string;
}

export interface RefreshSuggestion {
  id: string;
  title: string;
  reason: string;
  category: string;
  image?: string;
  icon: string;
  isCustom?: boolean;
}

export interface LinkedObject {
  id: string;
  name: string;
  habitId: string;
  habitName: string;
  lastScannedText: string;
  icon: string;
  type: 'NFC' | 'QR';
}

export interface WeeklyInsight {
  id: string;
  title: string;
  value?: string | number;
  label: string;
  icon: string;
  colorClass: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  routineStreak: number;
  connectedTagsCount: number;
  efficiency: number;
}
