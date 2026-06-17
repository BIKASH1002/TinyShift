/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, QrCode, Sparkles, BarChart3, User } from 'lucide-react';

export type TabType = 'today' | 'scan' | 'refresh' | 'insights' | 'profile';

interface BottomTabNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  className?: string;
}

export const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({
  activeTab,
  onChangeTab,
  className = '',
}) => {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: Calendar },
    { id: 'scan' as TabType, label: 'Scan', icon: QrCode },
    { id: 'refresh' as TabType, label: 'Refresh', icon: Sparkles },
    { id: 'insights' as TabType, label: 'Insights', icon: BarChart3 },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-surface-container shadow-2xl py-2 px-4 safe-bottom flex justify-around items-center rounded-t-3xl ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 active:scale-90 group relative cursor-pointer"
          >
            {/* Nav Icon */}
            <div
              className={`p-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant group-hover:text-primary-container'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>

            {/* Nav Label */}
            <span
              className={`font-medium tracking-tight mt-0.5 text-[10px] sm:text-xs transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant/80'
              }`}
            >
              {tab.label}
            </span>

            {/* Dot Indicator below active item */}
            {isActive && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
