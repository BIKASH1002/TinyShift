import React from 'react';
import { CalendarDays, LifeBuoy, SlidersHorizontal, NotebookPen, UserRound } from 'lucide-react';
export type TabType = 'today' | 'rescue' | 'refresh' | 'insights' | 'profile';
interface Props {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  className?: string;
}
const tabs = [
  { id: 'today', label: 'Today', detail: 'Your daily plan', icon: CalendarDays },
  { id: 'rescue', label: 'Rescue', detail: 'Find a smaller step', icon: LifeBuoy },
  { id: 'refresh', label: 'Adjust', detail: 'Learn from your week', icon: SlidersHorizontal },
  { id: 'insights', label: 'Reflect', detail: 'Notice what helps', icon: NotebookPen },
  { id: 'profile', label: 'Profile', detail: 'Make it yours', icon: UserRound },
] as const;
export const BottomTabNavigation: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  className = '',
}) => (
  <nav aria-label="Main navigation" className={`app-navigation ${className}`}>
    {tabs.map(({ id, label, detail, icon: Icon }) => (
      <button
        type="button"
        key={id}
        aria-current={activeTab === id ? 'page' : undefined}
        onClick={() => onChangeTab(id)}
      >
        <Icon size={21} aria-hidden="true" />
        <span>
          {label}
          <small>{detail}</small>
        </span>
      </button>
    ))}
  </nav>
);
