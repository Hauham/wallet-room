/**
 * Wallet List Component
 * Displays a grid of wallet cards
 */

import React from 'react';
import type { WalletInfo, Chain, WalletType } from '@/types';
import { WalletCard } from './WalletCard';

interface WalletListProps {
  wallets: WalletInfo[];
  onSelect?: (wallet: WalletInfo) => void;
  selectedWalletId?: string | null;
  filterChain?: Chain;
  filterType?: WalletType;
  emptyMessage?: string;
}

export function WalletList({
  wallets,
  onSelect,
  selectedWalletId,
  filterChain,
  filterType,
  emptyMessage = 'No wallets found',
}: WalletListProps): React.ReactElement {
  // Apply filters
  let filteredWallets = wallets;

  if (filterChain) {
    filteredWallets = filteredWallets.filter((w) => w.chain === filterChain);
  }

  if (filterType) {
    filteredWallets = filteredWallets.filter((w) => w.type === filterType);
  }

  if (filteredWallets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredWallets.map((wallet) => (
        <WalletCard
          key={wallet.id}
          wallet={wallet}
          onSelect={onSelect}
          isSelected={selectedWalletId === wallet.id}
        />
      ))}
    </div>
  );
}
