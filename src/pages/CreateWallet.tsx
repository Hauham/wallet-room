/**
 * Create Wallet Page
 * Form to create a new wallet or import from mnemonic
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts';
import { Card, Button, Input, Select } from '@/components/common';
import type { Chain, WalletType, BtcAddressType } from '@/types';

type CreateMode = 'generate' | 'import';

export function CreateWallet(): React.ReactElement {
  const navigate = useNavigate();
  const { dispatch, refreshWallets } = useApp();

  const [mode, setMode] = useState<CreateMode>('generate');
  const [chain, setChain] = useState<Chain>('BTC');
  const [walletType, setWalletType] = useState<WalletType>('cold');
  const [label, setLabel] = useState('');
  const [addressType, setAddressType] = useState<BtcAddressType>('native-segwit');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'backup' | 'confirm'>('form');

  const chainOptions = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'XRP', label: 'XRP Ledger (XRP)' },
    { value: 'TRON', label: 'TRON (TRX)' },
  ];

  const typeOptions = [
    { value: 'cold', label: 'Cold Wallet (Offline)' },
    { value: 'warm', label: 'Warm Wallet (Online)' },
  ];

  const btcAddressTypes = [
    { value: 'native-segwit', label: 'Native SegWit (bc1q...)' },
    { value: 'segwit', label: 'SegWit (3...)' },
    { value: 'legacy', label: 'Legacy (1...)' },
    { value: 'taproot', label: 'Taproot (bc1p...)' },
  ];

  const handleCreateWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        chain,
        type: walletType,
        label: label || undefined,
        addressType: chain === 'BTC' ? addressType : undefined,
      };

      if (mode === 'generate') {
        if (window.walletRoom) {
          const result = await window.walletRoom.wallet.createWallet(params);

          if (result.success && result.data) {
            setGeneratedMnemonic(result.data.mnemonic);
            setStep('backup');
          } else {
            setError(result.error?.message || 'Failed to create wallet');
          }
        } else {
          // Development fallback
          setGeneratedMnemonic(
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
          );
          setStep('backup');
        }
      } else {
        // Import mode
        if (!mnemonic.trim()) {
          setError('Please enter a mnemonic phrase');
          return;
        }

        const importParams = {
          ...params,
          mnemonic: mnemonic.trim(),
        };

        if (window.walletRoom) {
          const result = await window.walletRoom.wallet.importWallet(importParams);

          if (result.success && result.data) {
            dispatch({ type: 'ADD_WALLET', payload: result.data });
            await refreshWallets();
            navigate('/wallets');
          } else {
            setError(result.error?.message || 'Failed to import wallet');
          }
        } else {
          // Development fallback
          navigate('/wallets');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBackup = async () => {
    if (!mnemonicConfirmed) {
      setError('Please confirm you have backed up the mnemonic phrase');
      return;
    }

    setStep('confirm');
    await refreshWallets();
    navigate('/wallets');
  };

  // Form step
  if (step === 'form') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white">Create Wallet</h1>
          <p className="text-slate-400 mt-1">
            Generate a new wallet or import from an existing mnemonic phrase
          </p>
        </div>

        {/* Mode Toggle */}
        <Card>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'generate'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Generate New
            </button>
            <button
              onClick={() => setMode('import')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Import Existing
            </button>
          </div>

          <div className="space-y-4">
            <Select
              label="Blockchain"
              options={chainOptions}
              value={chain}
              onChange={(e) => setChain(e.target.value as Chain)}
            />

            {chain === 'BTC' && (
              <Select
                label="Address Type"
                options={btcAddressTypes}
                value={addressType}
                onChange={(e) => setAddressType(e.target.value as BtcAddressType)}
              />
            )}

            <Select
              label="Wallet Type"
              options={typeOptions}
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as WalletType)}
            />

            <Input
              label="Label (Optional)"
              placeholder="e.g., Main Savings"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />

            {mode === 'import' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Mnemonic Phrase
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg
                             text-white placeholder-slate-400 h-24 resize-none
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your 12 or 24 word mnemonic phrase..."
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWallet}
                isLoading={isLoading}
                className="flex-1"
              >
                {mode === 'generate' ? 'Generate Wallet' : 'Import Wallet'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Backup step
  if (step === 'backup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white">Backup Your Mnemonic</h1>
          <p className="text-slate-400 mt-1">
            Write down these words in order and store them safely
          </p>
        </div>

        <Card>
          {/* Warning */}
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-yellow-400 font-medium">Important Security Notice</h4>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Never share your mnemonic phrase with anyone. Anyone with access to these
                  words can steal your funds. Store this backup in a secure, offline location.
                </p>
              </div>
            </div>
          </div>

          {/* Mnemonic Display */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-2">
              {generatedMnemonic.split(' ').map((word, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-slate-600 rounded"
                >
                  <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                  <span className="text-white font-mono">{word}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation */}
          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={mnemonicConfirmed}
              onChange={(e) => setMnemonicConfirmed(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700
                         text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-slate-300">
              I have securely backed up my mnemonic phrase
            </span>
          </label>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('form')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleConfirmBackup} className="flex-1">
              I've Backed Up
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // This should not be reached due to step control
  return <></>;
}
