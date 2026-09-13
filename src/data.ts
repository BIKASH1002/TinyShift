import { Habit, RefreshSuggestion, WeeklyInsight, UserProfile } from './types';
const week = { M: false, T: false, W: false, T_day: false, F: false, S: false, S_day: false };
export const INITIAL_HABITS: Habit[] = [
  {
    id: 'demo-1',
    name: 'Morning movement',
    category: 'Movement',
    frequency: 'Daily',
    anchor: 'After I make my morning drink',
    normalVersion: 'Move for 20 minutes',
    minimumVersion: 'Stretch for 2 minutes',
    motivation: 'Begin the day with energy.',
    streak: 4,
    weeklyAvg: 72,
    statusToday: 'pending',
    completedToday: false,
    icon: 'Footprints',
    weeklyOverview: { ...week, M: true, T: true },
  },
  {
    id: 'demo-2',
    name: 'Focused learning',
    category: 'Learning',
    frequency: 'Weekdays',
    anchor: 'After I open my laptop',
    normalVersion: 'Study for 30 minutes',
    minimumVersion: 'Review one concept',
    motivation: 'Small lessons compound.',
    streak: 7,
    weeklyAvg: 84,
    statusToday: 'done',
    completionMode: 'normal',
    completedToday: true,
    icon: 'BookOpen',
    weeklyOverview: { ...week, M: true, T: true, W: true },
  },
];
export const INITIAL_SUGGESTIONS: RefreshSuggestion[] = [
  {
    id: 'demo-suggestion',
    title: 'Protect one tiny win',
    reason: 'Choose the smallest meaningful action when the full routine feels too heavy.',
    category: 'Focus',
    icon: 'Sparkles',
  },
];
export const MOCK_INSIGHTS: WeeklyInsight[] = [
  {
    id: 'completed',
    title: '0',
    label: 'Completed this week',
    icon: 'CheckSquare',
    colorClass: 'text-primary bg-primary/10',
  },
];
export const DEFAULT_PROFILE: UserProfile = {
  name: 'Friend',
  avatarUrl:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  routineStreak: 0,
  rescuedHabitsCount: 0,
  consistency: 0,
};
