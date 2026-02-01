/**
 * Card Component
 * Container with consistent styling
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export function Card({
  children,
  className = '',
  title,
  actions,
}: CardProps): React.ReactElement {
  return (
    <div
      className={`
        bg-slate-800 rounded-lg border border-slate-700
        ${className}
      `}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          {title && <h3 className="text-lg font-medium text-white">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
