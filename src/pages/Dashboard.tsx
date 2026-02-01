/**
 * Dashboard Page
 * Main overview of wallets and recent activity
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts';
import { Card, Button, ChainBadge } from '@/components/common';
import { WalletList } from '@/components/wallet';
import type { Chain } from '@/types';

const chains: Chain[] = ['BTC', 'ETH', 'XRP', 'TRON'];

export function Dashboard(): React.ReactElement {
  const { state } = useApp();
  const { wallets, mode } = state;

  // Count wallets by chain
  const walletsByChain = chains.reduce(
    (acc, chain) => {
      acc[chain] = wallets.filter((w) => w.chain === chain).length;
      return acc;
    },
    {} as Record<Chain, number>
  );

  // Count wallets by type
  const coldWallets = wallets.filter((w) => w.type === 'cold').length;
  const warmWallets = wallets.filter((w) => w.type === 'warm').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Manage your custodial wallets in{' '}
            <span
              className={mode === 'offline' ? 'text-cyan-400' : 'text-orange-400'}
            >
              {mode} mode
            </span>
          </p>
        </div>
        <Link to="/create-wallet">
          <Button>Create Wallet</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Wallets"
          value={wallets.length.toString()}
          icon="wallet"
        />
        <StatCard
          title="Cold Wallets"
          value={coldWallets.toString()}
          icon="cold"
          color="cyan"
        />
        <StatCard
          title="Warm Wallets"
          value={warmWallets.toString()}
          icon="warm"
          color="orange"
        />
        <StatCard
          title="Active Chains"
          value={chains.filter((c) => walletsByChain[c] > 0).length.toString()}
          icon="chain"
          color="blue"
        />
      </div>

      {/* Wallets by Chain */}
      <Card title="Wallets by Chain">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {chains.map((chain) => (
            <div
              key={chain}
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
            >
              <ChainBadge chain={chain} showName />
              <span className="text-xl font-bold text-white">
                {walletsByChain[chain]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Wallets */}
      <Card
        title="Recent Wallets"
        actions={
          wallets.length > 0 ? (
            <Link to="/wallets" className="text-blue-400 hover:text-blue-300 text-sm">
              View All
            </Link>
          ) : null
        }
      >
        {wallets.length > 0 ? (
          <WalletList
            wallets={wallets.slice(0, 6)}
            emptyMessage="No wallets yet"
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">You haven't created any wallets yet.</p>
            <Link to="/create-wallet">
              <Button>Create Your First Wallet</Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Create Wallet"
          description="Generate a new wallet with secure mnemonic"
          link="/create-wallet"
          icon="plus"
        />
        <QuickActionCard
          title="Sign Transaction"
          description="Sign a transaction with your wallet"
          link="/sign"
          icon="sign"
        />
        <QuickActionCard
          title="Import via QR"
          description="Scan QR code to import wallet or transaction"
          link="/import"
          icon="qr"
        />
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: 'wallet' | 'cold' | 'warm' | 'chain';
  color?: 'cyan' | 'orange' | 'blue';
}

function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: StatCardProps): React.ReactElement {
  const colorClasses = {
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-slate-700 ${colorClasses[color]}`}>
          <StatIcon type={icon} />
        </div>
      </div>
    </div>
  );
}

function StatIcon({
  type,
}: {
  type: 'wallet' | 'cold' | 'warm' | 'chain';
}): React.ReactElement {
  const icons = {
    wallet: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    ),
    cold: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    ),
    warm: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
    chain: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    ),
  };

  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[type]}
    </svg>
  );
}

// Quick Action Card
interface QuickActionCardProps {
  title: string;
  description: string;
  link: string;
  icon: 'plus' | 'sign' | 'qr';
}

function QuickActionCard({
  title,
  description,
  link,
  icon,
}: QuickActionCardProps): React.ReactElement {
  const icons = {
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    ),
    sign: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    ),
    qr: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      />
    ),
  };

  return (
    <Link
      to={link}
      className="block p-4 bg-slate-800 rounded-lg border border-slate-700
                 hover:border-slate-600 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-600/20 text-blue-400
                       group-hover:bg-blue-600/30 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icons[icon]}
          </svg>
        </div>
        <div>
          <h3 className="text-white font-medium">{title}</h3>
          <p className="text-slate-400 text-sm">{description}</p>
        </div>
      </div>
    </Link>
  );
}
