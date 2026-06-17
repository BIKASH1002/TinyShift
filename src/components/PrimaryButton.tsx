/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PrimaryButtonProps {
  id?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  id,
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  icon,
  className = '',
}) => {
  let baseStyle = 'h-[56px] px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-full shadow-sm';
  
  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-primary-container text-on-primary-container hover:brightness-105 shadow-md shadow-primary-container/10';
      break;
    case 'secondary':
      variantStyle = 'bg-primary text-white hover:brightness-110';
      break;
    case 'outline':
      variantStyle = 'border-2 border-outline-variant/60 text-on-surface hover:bg-surface-container-low';
      break;
    case 'danger':
      variantStyle = 'bg-error-container text-on-error-container hover:bg-error-container/80';
      break;
  }

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
