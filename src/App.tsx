/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Smartphone, Battery, Wifi, Signal, Sparkles, CheckCircle2 } from 'lucide-react';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AddHabitScreen } from './screens/AddHabitScreen';
import { HabitDetailScreen } from './screens/HabitDetailScreen';
import { ScanScreen } from './screens/ScanScreen';
import { RefreshScreen } from './screens/RefreshScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomTabNavigation, TabType } from './components/BottomTabNavigation';
import { INITIAL_HABITS, INITIAL_SUGGESTIONS, MOCK_RECENT_OBJECTS, MOCK_INSIGHTS, DEFAULT_PROFILE } from './data';
import { Habit, RefreshSuggestion, UserProfile } from './types';

type ScreenType = 'onboarding' | 'login' | 'main' | 'add-habit' | 'habit-detail';

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('onboarding');
  const [activeTab, setActiveTab] = useState<TabType>('today');
  
  // App state
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [suggestions, setSuggestions] = useState<RefreshSuggestion[]>(INITIAL_SUGGESTIONS);
  const [recentObjects, setRecentObjects] = useState(MOCK_RECENT_OBJECTS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [selectedRoutine, setSelectedRoutine] = useState<string>('morning');

  // Interactive Scan success modal state
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  // Toggle habit completion logic
  const handleToggleComplete = (habitId: string) => {
    setHabits((prevHabits) =>
      prevHabits.map((h) => {
        if (h.id === habitId) {
          const newCompleted = !h.completedToday;
          const streakDiff = newCompleted ? 1 : h.streak > 0 ? -1 : 0;
          return {
            ...h,
            completedToday: newCompleted,
            streak: h.streak + streakDiff,
            weeklyOverview: {
              ...h.weeklyOverview,
              W: newCompleted, // Wednesday represents today
            },
          };
        }
        return h;
      })
    );
  };

  // Add customized suggested habit to today's routines
  const handleAddCustomSuggestedHabit = (title: string, category: string, reason: string) => {
    const newId = `hb-${Date.now()}`;
    const newHabit: Habit = {
      id: newId,
      name: title,
      category: category as any,
      frequency: 'Daily',
      streak: 0,
      weeklyAvg: 50,
      linkedObject: 'AI Assigned Sticker',
      linkedObjectType: 'QR',
      completedToday: false,
      icon: category === 'Mood' ? 'Smile' : category === 'Focus' ? 'BookOpen' : 'Droplet',
      weeklyOverview: {
        M: false,
        T: false,
        W: false,
        T_day: false,
        F: false,
        S: false,
        S_day: false,
      },
      aiSuggestion: reason,
    };

    setHabits((prev) => [newHabit, ...prev]);
  };

  // Create customized user habit from Add Habit Form
  const handleAddHabit = (habitData: Partial<Habit>) => {
    const newId = `hb-${Date.now()}`;
    const fullHabit: Habit = {
      id: newId,
      name: habitData.name || 'Unnamed Habit',
      category: habitData.category || 'Health',
      frequency: habitData.frequency || 'Daily',
      streak: 0,
      weeklyAvg: 40,
      linkedObject: habitData.linkedObject || null,
      linkedObjectType: habitData.linkedObjectType || null,
      completedToday: false,
      icon: habitData.icon || 'Compass',
      weeklyOverview: habitData.weeklyOverview as any,
      aiSuggestion: habitData.aiSuggestion || undefined,
    };

    setHabits((prev) => [fullHabit, ...prev]);
    setScreen('main');
    setActiveTab('today');
  };

  // Carry out simulated NFC or QR Tag scan success
  const handleMockScanSuccess = (habitId: string, objectName: string) => {
    // 1. Mark corresponding habit completed
    setHabits((prevHabits) =>
      prevHabits.map((h) => {
        if (h.id === habitId && !h.completedToday) {
          return {
            ...h,
            completedToday: true,
            streak: h.streak + 1,
            weeklyOverview: {
              ...h.weeklyOverview,
              W: true,
            },
          };
        }
        return h;
      })
    );

    // 2. Add tag to scanned objects history recents
    setRecentObjects((prev) => {
      const existingIdx = prev.findIndex((o) => o.habitId === habitId);
      const matched = prev.find((o) => o.habitId === habitId);

      const updatedObj = matched
        ? { ...matched, lastScannedText: 'Just now' }
        : {
            id: `obj-${Date.now()}`,
            name: objectName,
            habitId,
            habitName: habits.find((h) => h.id === habitId)?.name || 'Linked habit',
            lastScannedText: 'Just now',
            icon: 'Tag',
            type: 'NFC' as const,
          };

      const filtered = prev.filter((o) => o.habitId !== habitId);
      return [updatedObj, ...filtered].slice(0, 3);
    });

    // 3. Complete profile connected tags count optionally
    setProfile((prev) => ({
      ...prev,
      connectedTagsCount: Math.max(prev.connectedTagsCount, recentObjects.length),
    }));

    // Trigger toast overlay inHomeScreen
    const updatedHabName = habits.find((h) => h.id === habitId)?.name || 'Habit';
    setScannedFeedback(`Simulated scan: completed "${updatedHabName}" habit via nearby tag!`);
    setTimeout(() => {
      setScannedFeedback(null);
    }, 3500);

    // Go to main Today habits dashboard so users can see the checkmark check
    setActiveTab('today');
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  // Render proper screen content based on navigation triggers
  const renderScreenContent = () => {
    if (screen === 'onboarding') {
      return (
        <OnboardingScreen
          onGetStarted={() => setScreen('login')}
          onSeeHowItWorks={() => {
            alert("DayTag connects everyday objects (like your water bottle, desk, or bathroom mirror) to quick habits using stickable NFC tags or QR codes. When you physically touch or scan them, your task gets completed instantly!");
          }}
        />
      );
    }

    if (screen === 'login') {
      return (
        <LoginScreen
          onLoginSuccess={(routine) => {
            setSelectedRoutine(routine);
            setScreen('main');
            setActiveTab('today');
          }}
        />
      );
    }

    if (screen === 'add-habit') {
      return (
        <AddHabitScreen
          onAddHabit={handleAddHabit}
          onClose={() => setScreen('main')}
        />
      );
    }

    if (screen === 'habit-detail' && selectedHabit) {
      return (
        <HabitDetailScreen
          habit={selectedHabit}
          onClose={() => {
            setScreen('main');
            setSelectedHabit(null);
          }}
          onToggleComplete={() => handleToggleComplete(selectedHabit.id)}
          onEditLinkedTag={() => {
            alert(`Connect your mobile device to ${selectedHabit.name}'s tag in scan settings.`);
          }}
        />
      );
    }

    // Tab Navigation Screen Routing
    switch (activeTab) {
      case 'today':
        return (
          <HomeScreen
            habits={habits}
            onToggleComplete={handleToggleComplete}
            onViewDetails={(habit) => {
              setSelectedHabit(habit);
              setScreen('habit-detail');
            }}
            onAddHabitClick={() => setScreen('add-habit')}
            userRoutineSegment={selectedRoutine}
          />
        );
      case 'scan':
        return (
          <ScanScreen
            recentObjects={recentObjects}
            onMockScanSuccess={handleMockScanSuccess}
            habits={habits}
          />
        );
      case 'refresh':
        return (
          <RefreshScreen
            suggestions={suggestions}
            onAddCustomSuggestedHabit={handleAddCustomSuggestedHabit}
          />
        );
      case 'insights':
        return <InsightsScreen insights={MOCK_INSIGHTS} />;
      case 'profile':
        return (
          <ProfileScreen
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={() => {
              setScreen('onboarding');
              setHabits(INITIAL_HABITS);
            }}
          />
        );
      default:
        return null;
    }
  };

  // Completion statistics for Bento Board
  const completedCount = habits.filter((h) => h.completedToday).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3436] font-sans flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Dynamic scan succeed feedback toast in HomeScreen */}
      {scannedFeedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface/95 text-inverse-on-surface text-xs font-semibold px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl animate-bounce">
          <Sparkles className="w-4 h-4 text-primary-container fill-primary" />
          <span>{scannedFeedback}</span>
        </div>
      )}

      {/* Main Grid: Columns layout for reactive side-by-side display */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        
        {/* Left Side: Smartphone Simulation Core App (col-span-12 on mobile, col-span-5 on desktop) */}
        <div className="col-span-1 lg:col-span-5 xl:col-span-4 flex justify-center w-full">
          {/* Styled Smartphone Canvas Frame */}
          <div className="relative w-full max-w-sm sm:max-w-md min-h-[820px] max-h-[860px] rounded-[48px] shadow-2xl overflow-hidden bg-[#FAF9F6] border-[12px] border-[#2D3436] flex flex-col justify-between">
            {/* Device Notch & Status bar for mobile mockup details */}
            <div className="bg-white/40 backdrop-blur-md px-6 py-3 flex justify-between items-center text-xs font-bold text-on-surface select-none z-40 relative flex-shrink-0">
              <span className="font-extrabold tracking-tight">09:41</span>
              {/* Mock hardware icons */}
              <div className="flex items-center gap-1.5 opacity-80">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Dynamic Inner Application Frame Screen content wrapper */}
            <div className="flex-1 relative overflow-hidden flex flex-col justify-between bg-[#FDFBF7]">
              {renderScreenContent()}
            </div>

            {/* Floating bottom nav bar when inside primary application flow */}
            {screen === 'main' && (
              <BottomTabNavigation
                activeTab={activeTab}
                onChangeTab={(tab) => {
                  setActiveTab(tab);
                }}
                className="absolute bottom-0 left-0 right-0"
              />
            )}
          </div>
        </div>

        {/* Right Side: Bento Grid Dashboard Widget Panel (col-span-7 on desktop) */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col space-y-6 w-full animate-fade-in pr-2">
          {/* Bento Header */}
          <div className="flex justify-between items-end pb-2 border-b border-surface-container-high">
            <div>
              <h1 className="text-3xl font-display font-black text-on-surface leading-none tracking-tight">
                Hello, {profile.name}
              </h1>
              <p className="text-xs text-on-surface-variant font-semibold mt-2 tracking-wide uppercase">
                Welcome to DayTag Bento Workspace
              </p>
            </div>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Daily Progress Card Widget in Bento */}
          <div className="bg-[#FFF7ED] p-7 rounded-[32px] border border-[#FFEDD5] flex items-center justify-between shadow-xs transition-transform duration-300 hover:scale-[1.01]">
            <div className="flex-1 mr-6">
              <p className="text-xs text-[#9A3412] font-black uppercase tracking-wider mb-1.5">Daily Goal Progress</p>
              <h3 className="font-display font-extrabold text-lg text-on-surface leading-tight mb-2">
                {percentage === 100 ? 'Incredible! You completed all physical habits today 🎉' : 'Anchor your habits around physical environments.'}
              </h3>
              <div className="flex items-center space-x-4 pt-1">
                <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-inner border border-[#FFE7CC]">
                  <div
                    className="h-full bg-[#E67E22] transition-all duration-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-black text-[#9A3412] tracking-tight">{percentage}% Done</span>
              </div>
            </div>
            <div className="text-3xl bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs flex-shrink-0 animate-pulse" style={{ animationDuration: '3s' }}>
              🔋
            </div>
          </div>

          {/* Core Bento Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Widget 1: Routine Refresh */}
            <div className="bg-[#F5F3FF] p-7 rounded-[32px] flex flex-col justify-between border border-[#DDD6FE] min-h-[220px] shadow-xs">
              <div>
                <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs mb-4">✨</div>
                <h2 className="text-lg font-display font-extrabold text-on-surface mb-1.5">Routine Refresh</h2>
                <p className="text-[#6D28D9] text-xs font-semibold leading-relaxed">
                  {suggestions.length > 0
                    ? `AI analysis suggests adopting: "${suggestions[0].title}". ${suggestions[0].reason}`
                    : "No pending suggestions. You have integrated all recommendation tasks into your habits list!"}
                </p>
              </div>
              {suggestions.length > 0 ? (
                <button
                  onClick={() => {
                    const sug = suggestions[0];
                    handleAddCustomSuggestedHabit(sug.title, sug.category, sug.reason);
                    setSuggestions((prev) => prev.filter((item) => item.id !== sug.id));
                    setScannedFeedback(`Added suggested habit: "${sug.title}"`);
                    setTimeout(() => setScannedFeedback(null), 3000);
                  }}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xxs tracking-wider uppercase py-3 px-5 rounded-xl w-max shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 mt-3"
                >
                  Apply Refresh Recommendation
                </button>
              ) : (
                <span className="text-xxs text-[#7C3AED]/70 font-bold uppercase tracking-wider mt-3">Up-to-Date ✨</span>
              )}
            </div>

            {/* Widget 2: Weekly Insight with visual micro bar chart */}
            <div className="bg-[#ECFDF5] p-7 rounded-[32px] flex flex-col justify-between border border-[#A7F3D0] min-h-[220px] shadow-xs">
              <div>
                <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs mb-4">📊</div>
                <h2 className="text-lg font-display font-extrabold text-on-surface mb-1.5">Weekly Insight</h2>
                <p className="text-[#047857] text-xs font-semibold leading-relaxed">
                  You are 15% more likely to complete habits when you use physical NFC or QR sticker triggers instead of manual edits.
                </p>
              </div>

              {/* Dynamic live bars */}
              <div className="flex space-x-2.5 items-end h-[60px] pt-4 px-1.5">
                {habits.slice(0, 7).map((h) => {
                  const completions = Object.values(h.weeklyOverview).filter(v => v).length;
                  const score = Math.max(15, Math.min(100, Math.round((completions / 7) * 100)));
                  return (
                    <div key={h.id} className="flex-1 h-full flex flex-col justify-end group relative cursor-help">
                      <div
                        className="bg-[#10B981] rounded-t-md hover:bg-[#059669] transition-all duration-300"
                        style={{ height: `${score}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-inverse-surface/95 text-inverse-on-surface text-[9px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {h.name}: {score}% Completed
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sub-Metric Rows in Bento Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Day Streak Card */}
            <div className="bg-white p-6 rounded-[28px] border border-surface-container shadow-xs flex flex-col justify-center items-center text-center transition-all duration-300 hover:scale-[1.02]">
              <div className="text-3xl mb-1.5">🔥</div>
              <div className="text-2xl font-display font-black text-on-surface">{profile.routineStreak}</div>
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-on-surface-variant mt-0.5">Day Streak</div>
            </div>

            {/* Active Tags Card */}
            <div className="bg-white p-6 rounded-[28px] border border-surface-container shadow-xs flex flex-col justify-center items-center text-center transition-all duration-300 hover:scale-[1.02]">
              <div className="text-3xl mb-1.5">🏷️</div>
              <div className="text-2xl font-display font-black text-on-surface">{profile.connectedTagsCount}</div>
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-on-surface-variant mt-0.5">Active Tags</div>
            </div>

            {/* DayTag Pro premium widget */}
            <div className="bg-[#2D3436] p-5 rounded-[28px] shadow-sm flex flex-col justify-between text-white min-h-[120px] transition-all duration-300 hover:scale-[1.02]">
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-widest font-extrabold mb-0.5">Membership Plan</p>
                <p className="font-display font-black text-sm">DayTag Premium Pro</p>
              </div>
              <div className="bg-[#E67E22] text-white text-[10px] font-black tracking-wider uppercase py-2 px-3 rounded-xl text-center shadow-sm select-none">
                PRO ACTIVE MEMBER
              </div>
            </div>
          </div>

          {/* Quick Tip Footer Banner in Bento Grid */}
          <div className="col-span-1 bg-[#FEF3C7] rounded-[28px] p-5.5 flex items-center justify-between border border-[#FDE68A] shadow-xs">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-lg shadow-xs flex-shrink-0">
                💡
              </div>
              <div>
                <p className="font-display font-extrabold text-sm text-[#92400E]">Quick Pro Tip</p>
                <p className="text-xs text-[#92400E]/85 font-medium leading-relaxed mt-0.5">
                  NFC sticker tags cost as little as $5 online. Paste them on water bottles, mirrors, journals, and keys to create physical landmarks that automate task tracking effortlessly!
                </p>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full border border-[#D97706] bg-[#FFFBEB] flex items-center justify-center text-[#D97706] text-xs font-black select-none flex-shrink-0">
              i
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
