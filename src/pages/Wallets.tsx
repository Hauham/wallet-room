/**
 * Wallets Page
 * Lists all wallets with filtering
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts';
import { Card, Button, Select } from '@/components/common';
import { WalletList } from '@/components/wallet';
import type { Chain, WalletType } from '@/types';

export function Wallets(): React.ReactElement {
  const { state, dispatch } = useApp();
  const { wallets, selectedWalletId } = state;

  const [filterChain, setFilterChain] = useState<Chain | ''>('');
  const [filterType, setFilterType] = useState<WalletType | ''>('');

  const chainOptions = [
    { value: '', label: 'All Chains' },
    { value: 'BTC', label: 'Bitcoin' },
    { value: 'ETH', label: 'Ethereum' },
    { value: 'XRP', label: 'XRP Ledger' },
    { value: 'TRON', label: 'TRON' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'cold', label: 'Cold Wallets' },
    { value: 'warm', label: 'Warm Wallets' },
  ];

  const handleSelect = (wallet: { id: string }) => {
    dispatch({
      type: 'SELECT_WALLET',
      payload: wallet.id === selectedWalletId ? null : wallet.id,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallets</h1>
          <p className="text-slate-400 mt-1">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/create-wallet">
          <Button>Create Wallet</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              label="Chain"
              options={chainOptions}
              value={filterChain}
              onChange={(e) => setFilterChain(e.target.value as Chain | '')}
            />
          </div>
          <div className="w-48">
            <Select
              label="Type"
              options={typeOptions}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as WalletType | '')}
            />
          </div>
          {(filterChain || filterType) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterChain('');
                  setFilterType('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Wallet List */}
      <WalletList
        wallets={wallets}
        onSelect={handleSelect}
        selectedWalletId={selectedWalletId}
        filterChain={filterChain || undefined}
        filterType={filterType || undefined}
        emptyMessage={
          filterChain || filterType
            ? 'No wallets match the current filters'
            : 'No wallets created yet. Create your first wallet to get started.'
        }
      />
    </div>
  );
}
