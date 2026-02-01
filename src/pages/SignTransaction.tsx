/**
 * Sign Transaction Page
 * Build and sign transactions
 */

import React, { useState } from 'react';
import { useApp } from '@/contexts';
import { Card, Button, Input, Select, ChainBadge } from '@/components/common';
import type { Chain, WalletInfo, UnsignedTransaction } from '@/types';

type SignStep = 'select' | 'build' | 'review' | 'signed';

export function SignTransaction(): React.ReactElement {
  const { state } = useApp();
  const { wallets, mode } = state;

  const [step, setStep] = useState<SignStep>('select');
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction | null>(null);
  const [signedTxHash, setSignedTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chain-specific prerequisites
  const [nonce, setNonce] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('21000');
  const [sequence, setSequence] = useState('');
  const [destinationTag, setDestinationTag] = useState('');
  const [feeRate, setFeeRate] = useState('10');

  // Filter active wallets
  const activeWallets = wallets.filter((w) => w.isActive);

  const handleSelectWallet = (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    setStep('build');
    setError(null);
  };

  const handleBuildTransaction = async () => {
    if (!selectedWallet) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!recipient.trim()) {
        setError('Please enter a recipient address');
        return;
      }

      if (!amount.trim() || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      // Validate address
      if (window.walletRoom) {
        const isValid = await window.walletRoom.wallet.validateAddress(
          selectedWallet.chain,
          recipient
        );
        if (!isValid) {
          setError('Invalid recipient address for this chain');
          return;
        }
      }

      // Validate chain-specific prerequisites
      if (selectedWallet.chain === 'ETH') {
        if (!nonce.trim() || isNaN(parseInt(nonce))) {
          setError('Please enter a valid nonce (get from blockchain explorer)');
          return;
        }
        if (!gasPrice.trim() || isNaN(parseFloat(gasPrice))) {
          setError('Please enter a valid gas price in Gwei');
          return;
        }
      }

      if (selectedWallet.chain === 'XRP') {
        if (!sequence.trim() || isNaN(parseInt(sequence))) {
          setError('Please enter a valid sequence number (get from XRP explorer)');
          return;
        }
      }

      // Build transaction params
      const params = {
        chain: selectedWallet.chain,
        from: selectedWallet.address,
        to: recipient.trim(),
        amount: amount.trim(),
        memo: memo.trim() || undefined,
        // ETH specific
        gasLimit: selectedWallet.chain === 'ETH' ? gasLimit : undefined,
        gasPrice: selectedWallet.chain === 'ETH' ? (BigInt(parseFloat(gasPrice) * 1e9)).toString() : undefined,
        // BTC specific
        feeRate: selectedWallet.chain === 'BTC' ? parseInt(feeRate) : undefined,
        // XRP specific
        destinationTag: selectedWallet.chain === 'XRP' && destinationTag ? parseInt(destinationTag) : undefined,
      };

      const prerequisites = {
        chain: selectedWallet.chain,
        address: selectedWallet.address,
        // ETH specific
        nonce: selectedWallet.chain === 'ETH' ? parseInt(nonce) : undefined,
        // XRP specific
        sequence: selectedWallet.chain === 'XRP' ? parseInt(sequence) : undefined,
        // BTC specific - UTXOs would need to be provided in a real implementation
        utxos: selectedWallet.chain === 'BTC' ? [] : undefined,
      };

      if (window.walletRoom) {
        const result = await window.walletRoom.transaction.buildTransaction(
          params,
          prerequisites
        );

        if (result.success && result.data) {
          setUnsignedTx(result.data as UnsignedTransaction);
          setStep('review');
        } else {
          setError(result.error?.message || 'Failed to build transaction');
        }
      } else {
        // Development fallback
        setUnsignedTx({
          id: 'dev_tx_' + Date.now(),
          chain: selectedWallet.chain,
          from: selectedWallet.address,
          to: recipient,
          amount: amount,
          fee: '1000',
          createdAt: Date.now(),
        });
        setStep('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignTransaction = async () => {
    if (!selectedWallet || !unsignedTx) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.transaction.signTransaction(
          selectedWallet.id,
          unsignedTx
        );

        if (result.success && result.data) {
          setSignedTxHash((result.data as { txHash: string }).txHash);
          setStep('signed');
        } else {
          setError(result.error?.message || 'Failed to sign transaction');
        }
      } else {
        // Development fallback
        setSignedTxHash('0x' + Date.now().toString(16));
        setStep('signed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedWallet(null);
    setRecipient('');
    setAmount('');
    setMemo('');
    setUnsignedTx(null);
    setSignedTxHash(null);
    setError(null);
    // Reset prerequisites
    setNonce('');
    setGasPrice('');
    setGasLimit('21000');
    setSequence('');
    setDestinationTag('');
    setFeeRate('10');
  };

  // Select wallet step
  if (step === 'select') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white">Sign Transaction</h1>
          <p className="text-slate-400 mt-1">Select a wallet to sign a transaction</p>
        </div>

        <Card title="Select Wallet">
          {activeWallets.length > 0 ? (
            <div className="space-y-2">
              {activeWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleSelectWallet(wallet)}
                  className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg
                             text-left transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ChainBadge chain={wallet.chain} />
                    <div>
                      <p className="text-white font-medium">
                        {wallet.label || `${wallet.chain} Wallet`}
                      </p>
                      <p className="text-slate-400 text-sm font-mono">
                        {formatAddress(wallet.address)}
                      </p>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No wallets available. Create a wallet first.</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Build transaction step
  if (step === 'build' && selectedWallet) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white">Build Transaction</h1>
          <p className="text-slate-400 mt-1">Enter transaction details</p>
        </div>

        <Card>
          {/* Selected Wallet */}
          <div className="mb-6 p-4 bg-slate-700 rounded-lg">
            <p className="text-slate-400 text-sm mb-1">From</p>
            <div className="flex items-center gap-2">
              <ChainBadge chain={selectedWallet.chain} />
              <span className="text-white font-mono">
                {formatAddress(selectedWallet.address)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Recipient Address"
              placeholder={getAddressPlaceholder(selectedWallet.chain)}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />

            <Input
              label={`Amount (${getChainSymbol(selectedWallet.chain)})`}
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              label="Memo (Optional)"
              placeholder="Optional message or reference"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />

            {/* Chain-specific prerequisites */}
            {selectedWallet.chain === 'ETH' && (
              <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Offline Mode: Enter values from Etherscan</span>
                </div>
                <Input
                  label="Nonce (Required)"
                  type="number"
                  placeholder="Get from Etherscan"
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Gas Price (Gwei)"
                    type="number"
                    placeholder="20"
                    value={gasPrice}
                    onChange={(e) => setGasPrice(e.target.value)}
                  />
                  <Input
                    label="Gas Limit"
                    type="number"
                    placeholder="21000"
                    value={gasLimit}
                    onChange={(e) => setGasLimit(e.target.value)}
                  />
                </div>
              </div>
            )}

            {selectedWallet.chain === 'XRP' && (
              <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Offline Mode: Enter values from XRP Explorer</span>
                </div>
                <Input
                  label="Account Sequence (Required)"
                  type="number"
                  placeholder="Get from XRP explorer"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                />
                <Input
                  label="Destination Tag (Optional)"
                  type="number"
                  placeholder="For exchanges"
                  value={destinationTag}
                  onChange={(e) => setDestinationTag(e.target.value)}
                />
              </div>
            )}

            {selectedWallet.chain === 'BTC' && (
              <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Offline Mode: BTC requires UTXOs (not yet supported)</span>
                </div>
                <Input
                  label="Fee Rate (sat/vB)"
                  type="number"
                  placeholder="10"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                />
                <p className="text-slate-400 text-sm">
                  BTC transactions require UTXO data. Please use QR import for offline signing.
                </p>
              </div>
            )}

            {selectedWallet.chain === 'TRON' && (
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Offline Mode: TRON requires block reference (using defaults)</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleBuildTransaction}
                isLoading={isLoading}
                className="flex-1"
              >
                Review Transaction
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Review step
  if (step === 'review' && selectedWallet && unsignedTx) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Transaction</h1>
          <p className="text-slate-400 mt-1">Confirm transaction details before signing</p>
        </div>

        <Card>
          <div className="space-y-4">
            <TransactionRow label="Chain" value={<ChainBadge chain={unsignedTx.chain} showName />} />
            <TransactionRow label="From" value={formatAddress(unsignedTx.from)} mono />
            <TransactionRow label="To" value={formatAddress(unsignedTx.to)} mono />
            <TransactionRow
              label="Amount"
              value={`${unsignedTx.amount} ${getChainSymbol(unsignedTx.chain)}`}
            />
            <TransactionRow
              label="Fee"
              value={`${unsignedTx.fee} ${getChainSymbol(unsignedTx.chain)}`}
            />
            {unsignedTx.memo && <TransactionRow label="Memo" value={unsignedTx.memo} />}
          </div>

          {/* Warning for offline mode */}
          {mode === 'offline' && (
            <div className="mt-6 p-4 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-cyan-400 text-sm">
                    Running in offline mode. After signing, export the transaction via QR
                    code to broadcast from an online device.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={() => setStep('build')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleSignTransaction} isLoading={isLoading} className="flex-1">
              Sign Transaction
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Signed step
  if (step === 'signed' && signedTxHash) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Transaction Signed</h1>
          <p className="text-slate-400 mt-1">Your transaction has been signed successfully</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Transaction Hash</p>
              <p className="text-white font-mono text-sm bg-slate-700 p-3 rounded break-all">
                {signedTxHash}
              </p>
            </div>

            {mode === 'offline' && (
              <div className="p-4 bg-slate-700 rounded-lg">
                <p className="text-slate-300 mb-3">
                  To broadcast this transaction, export it as a QR code and scan it from an
                  online device.
                </p>
                <Button variant="secondary" className="w-full">
                  Export as QR Code
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleReset} className="w-full">
              Sign Another Transaction
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // This should not be reached due to step control
  return <></>;
}

// Helper components
interface TransactionRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function TransactionRow({ label, value, mono }: TransactionRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}

// Helper functions
function formatAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-10)}`;
}

function getChainSymbol(chain: Chain): string {
  const symbols: Record<Chain, string> = {
    BTC: 'BTC',
    ETH: 'ETH',
    XRP: 'XRP',
    TRON: 'TRX',
  };
  return symbols[chain];
}

function getAddressPlaceholder(chain: Chain): string {
  const placeholders: Record<Chain, string> = {
    BTC: 'bc1q...',
    ETH: '0x...',
    XRP: 'r...',
    TRON: 'T...',
  };
  return placeholders[chain];
}
