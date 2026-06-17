/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Lucide from 'lucide-react';

interface EmptyStateProps {
  id?: string;
  icon?: keyof typeof Lucide;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  icon = 'Compass',
  title,
  description,
  actionText,
  onActionClick,
}) => {
  const IconComponent = Lucide[icon] as React.ComponentType<{ className?: string }>;

  return (
    <div id={id} className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white rounded-3xl border border-surface-container shadow-sm max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary-container mb-4">
        {IconComponent && <IconComponent className="w-8 h-8 text-primary" />}
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="font-body-md text-on-surface-variant text-sm mb-6 max-w-xs">{description}</p>
      {actionText && onActionClick && (
        <button
          onClick={onActionClick}
          className="px-6 py-3 h-12 bg-primary-container text-on-primary-container rounded-full font-semibold text-sm transition-transform active:scale-95 shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
