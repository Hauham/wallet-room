/**
 * Wallet Card Component
 * Displays wallet summary information
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { WalletInfo } from '@/types';
import { ChainBadge } from '@/components/common';

interface WalletCardProps {
  wallet: WalletInfo;
  onSelect?: (wallet: WalletInfo) => void;
  isSelected?: boolean;
}

export function WalletCard({
  wallet,
  onSelect,
  isSelected = false,
}: WalletCardProps): React.ReactElement {
  const shortAddress = formatAddress(wallet.address);

  const handleClick = () => {
    onSelect?.(wallet);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${
          isSelected
            ? 'bg-blue-600/20 border-blue-500'
            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChainBadge chain={wallet.chain} />
          <span
            className={`text-xs uppercase ${
              wallet.type === 'cold' ? 'text-cyan-400' : 'text-orange-400'
            }`}
          >
            {wallet.type}
          </span>
        </div>
        {!wallet.isActive && (
          <span className="text-xs text-slate-500">Archived</span>
        )}
      </div>

      {/* Label */}
      <h4 className="text-white font-medium mb-1">
        {wallet.label || `${wallet.chain} Wallet`}
      </h4>

      {/* Address */}
      <p className="text-slate-400 text-sm font-mono mb-3">{shortAddress}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Created {formatDate(wallet.createdAt)}</span>
        <Link
          to={`/wallet/${wallet.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-blue-400 hover:text-blue-300"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

/**
 * Formats address for display (truncated)
 */
function formatAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

/**
 * Formats timestamp for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}
