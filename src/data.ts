/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Habit, RefreshSuggestion, LinkedObject, WeeklyInsight, UserProfile } from './types';

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'hb-1',
    name: 'Drink Water',
    category: 'Health',
    frequency: 'Daily',
    streak: 12,
    weeklyAvg: 85,
    linkedObject: 'Water Bottle',
    linkedObjectType: 'NFC',
    completedToday: false,
    icon: 'Droplet',
    weeklyOverview: {
      M: true,
      T: true,
      W: true,
      T_day: false,
      F: true,
      S: true,
      S_day: false
    },
    aiSuggestion: 'Try drinking water before checking your phone in the morning.'
  },
  {
    id: 'hb-2',
    name: 'Focus Session',
    category: 'Focus',
    frequency: 'Weekdays',
    streak: 5,
    weeklyAvg: 90,
    linkedObject: 'Desk',
    linkedObjectType: 'QR',
    completedToday: true,
    icon: 'BookOpen',
    weeklyOverview: {
      M: true,
      T: true,
      W: true,
      T_day: true,
      F: false,
      S: false,
      S_day: false
    },
    aiSuggestion: 'Group micro-interruptions and respond only during designated blocks.'
  },
  {
    id: 'hb-3',
    name: 'Mood Check-in',
    category: 'Mood',
    frequency: 'Daily',
    streak: 14,
    weeklyAvg: 92,
    linkedObject: 'Mirror',
    linkedObjectType: 'NFC',
    completedToday: false,
    icon: 'Smile',
    weeklyOverview: {
      M: true,
      T: false,
      W: true,
      T_day: true,
      F: true,
      S: true,
      S_day: true
    },
    aiSuggestion: 'Acknowledge your emotional state without judgment to build mental resilience.'
  },
  {
    id: 'hb-4',
    name: 'Read 10 Pages',
    category: 'Learning',
    frequency: 'Daily',
    streak: 8,
    weeklyAvg: 75,
    linkedObject: null,
    linkedObjectType: null,
    completedToday: false,
    icon: 'BookOpen',
    weeklyOverview: {
      M: true,
      T: true,
      W: false,
      T_day: true,
      F: false,
      S: true,
      S_day: false
    },
    aiSuggestion: 'Read right after your alarm goes off to form an unbreakable reading anchor.'
  },
  {
    id: 'hb-5',
    name: 'Evening Stroll',
    category: 'Movement',
    frequency: 'Custom',
    streak: 0,
    weeklyAvg: 35,
    linkedObject: 'Front Door Key',
    linkedObjectType: 'QR',
    completedToday: false,
    icon: 'CloudRain',
    weeklyOverview: {
      M: false,
      T: false,
      W: false,
      T_day: false,
      F: false,
      S: false,
      S_day: false
    },
    aiSuggestion: 'A brief walk in nature boosts focus levels by over 20% for active tasks.'
  }
];

export const INITIAL_SUGGESTIONS: RefreshSuggestion[] = [
  {
    id: 'sug-1',
    title: 'New Morning Playlist',
    reason: 'Music shifts mood instantly. Try something upbeat but acoustic to ease into the day.',
    category: 'Atmosphere',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    icon: 'Music'
  },
  {
    id: 'sug-2',
    title: '5-minute Sunlight Break',
    reason: 'Boosts vitamin D and energy. Step outside or find a sunny window to anchor your focus.',
    category: 'Sunlight',
    icon: 'Sun'
  },
  {
    id: 'sug-3',
    title: 'Rearrange your Desk',
    reason: 'A new layout sparks creativity. Even moving your lamp or monitor can refresh your perspective.',
    category: 'Environment',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=80',
    icon: 'Layout'
  }
];

export const MOCK_RECENT_OBJECTS: LinkedObject[] = [
  {
    id: 'obj-1',
    name: 'Water Bottle',
    habitId: 'hb-1',
    habitName: 'Drink Water',
    lastScannedText: '2h ago',
    icon: 'Droplet',
    type: 'NFC'
  },
  {
    id: 'obj-2',
    name: 'Office Desk',
    habitId: 'hb-2',
    habitName: 'Focus Session',
    lastScannedText: '4h ago',
    icon: 'Laptop',
    type: 'QR'
  },
  {
    id: 'obj-3',
    name: 'Bathroom Mirror',
    habitId: 'hb-3',
    habitName: 'Mood Check-in',
    lastScannedText: '8h ago',
    icon: 'Smile',
    type: 'NFC'
  }
];

export const MOCK_INSIGHTS: WeeklyInsight[] = [
  {
    id: 'ins-1',
    title: '24',
    label: 'Habits Completed',
    icon: 'CheckSquare',
    colorClass: 'text-primary bg-primary/10'
  },
  {
    id: 'ins-2',
    title: 'Morning focus',
    label: 'Best moment',
    icon: 'Sun',
    colorClass: 'text-secondary bg-secondary/10'
  },
  {
    id: 'ins-3',
    title: 'Stable',
    label: 'Mood Trend',
    icon: 'Activity',
    colorClass: 'text-tertiary bg-tertiary/10'
  }
];

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Ananya',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  routineStreak: 14,
  connectedTagsCount: 3,
  efficiency: 92
};
