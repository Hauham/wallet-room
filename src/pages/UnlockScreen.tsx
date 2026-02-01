/**
 * Unlock Screen
 * Password entry to unlock the application
 */

import React, { useState } from 'react';
import { Button, Input } from '@/components/common';
import { useApp } from '@/contexts';

export function UnlockScreen(): React.ReactElement {
  const { unlock, state } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await unlock(password);

      if (!success) {
        setError('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-4">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Wallet Room</h1>
          <p className="text-slate-400 mt-2">
            {state.mode === 'offline' ? 'Air-Gapped Wallet Manager' : 'Custodial Wallet Manager'}
          </p>
        </div>

        {/* Unlock Form */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!password}
              className="w-full"
            >
              Unlock
            </Button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-4">
            First time? Enter a password to set up your wallet.
          </p>
        </div>

        {/* Mode indicator */}
        <div className="text-center mt-6">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              state.mode === 'offline'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {state.mode === 'offline' ? 'Offline Mode' : 'Online Mode'}
          </span>
        </div>
      </div>
    </div>
  );
}
