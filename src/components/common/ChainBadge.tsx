/**
 * Chain Badge Component
 * Displays chain identifier with appropriate styling
 */

import React from 'react';
import type { Chain } from '@/types';
import { CHAIN_NAMES, CHAIN_SYMBOLS } from '@/types';

interface ChainBadgeProps {
  chain: Chain;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const chainColors: Record<Chain, string> = {
  BTC: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ETH: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  XRP: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  TRON: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function ChainBadge({
  chain,
  showName = false,
  size = 'md',
}: ChainBadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-medium
                  ${chainColors[chain]} ${sizeClasses[size]}`}
    >
      <span>{CHAIN_SYMBOLS[chain]}</span>
      {showName && <span>{CHAIN_NAMES[chain]}</span>}
    </span>
  );
}
