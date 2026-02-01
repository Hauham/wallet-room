/**
 * Wallet Detail Page
 * Displays detailed information about a specific wallet
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/contexts';
import { Card, Button, ChainBadge, Input } from '@/components/common';
import type { WalletInfo } from '@/types';

export function WalletDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { wallets } = state;

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const found = wallets.find((w) => w.id === id);
    if (found) {
      setWallet(found);
      setEditLabel(found.label || '');
    }
  }, [id, wallets]);

  if (!wallet) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-fadeIn">
        <Card>
          <div className="text-center py-8">
            <p className="text-slate-400">Wallet not found</p>
            <Button onClick={() => navigate('/wallets')} className="mt-4">
              Back to Wallets
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleUpdateLabel = async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.wallet.updateWallet(wallet.id, {
          label: editLabel.trim() || undefined,
        });

        if (result.success && result.data) {
          const updatedWallet = result.data as WalletInfo;
          dispatch({ type: 'UPDATE_WALLET', payload: { id: updatedWallet.id, updates: updatedWallet } });
          setIsEditing(false);
        } else {
          setError(result.error?.message || 'Failed to update wallet');
        }
      } else {
        // Development fallback
        const updated = { ...wallet, label: editLabel.trim() || undefined, updatedAt: Date.now() };
        dispatch({ type: 'UPDATE_WALLET', payload: { id: wallet.id, updates: updated } });
        setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.wallet.updateWallet(wallet.id, {
          isActive: !wallet.isActive,
        });

        if (result.success && result.data) {
          const updatedWallet = result.data as WalletInfo;
          dispatch({ type: 'UPDATE_WALLET', payload: { id: updatedWallet.id, updates: updatedWallet } });
        } else {
          setError(result.error?.message || 'Failed to update wallet');
        }
      } else {
        // Development fallback
        const updated = { ...wallet, isActive: !wallet.isActive, updatedAt: Date.now() };
        dispatch({ type: 'UPDATE_WALLET', payload: { id: wallet.id, updates: updated } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!wallet) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this wallet? This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.wallet.deleteWallet(wallet.id);

        if (result.success) {
          dispatch({ type: 'DELETE_WALLET', payload: wallet.id });
          navigate('/wallets');
        } else {
          setError(result.error?.message || 'Failed to delete wallet');
        }
      } else {
        // Development fallback
        dispatch({ type: 'DELETE_WALLET', payload: wallet.id });
        navigate('/wallets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/wallets"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Wallets
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {wallet.label || `${wallet.chain} Wallet`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ChainBadge chain={wallet.chain} showName />
          <span
            className={`text-xs uppercase px-2 py-1 rounded ${
              wallet.type === 'cold'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            {wallet.type}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Address Section */}
      <Card title="Address">
        <div className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm mb-2">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-white font-mono text-sm bg-slate-700 p-3 rounded break-all">
                {wallet.address}
              </code>
              <Button
                variant="secondary"
                onClick={() => handleCopy(wallet.address, 'address')}
                className="flex-shrink-0"
              >
                {copied === 'address' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-sm mb-2">Public Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-white font-mono text-xs bg-slate-700 p-3 rounded break-all">
                {wallet.publicKey}
              </code>
              <Button
                variant="secondary"
                onClick={() => handleCopy(wallet.publicKey, 'publicKey')}
                className="flex-shrink-0"
              >
                {copied === 'publicKey' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Wallet Details */}
      <Card title="Details">
        <div className="space-y-3">
          <DetailRow label="Chain" value={<ChainBadge chain={wallet.chain} showName />} />
          <DetailRow label="Type" value={wallet.type === 'cold' ? 'Cold Wallet' : 'Warm Wallet'} />
          {wallet.addressType && <DetailRow label="Address Type" value={wallet.addressType} />}
          <DetailRow label="Derivation Path" value={wallet.derivationPath} mono />
          <DetailRow label="Status" value={wallet.isActive ? 'Active' : 'Archived'} />
          <DetailRow label="Created" value={formatDateTime(wallet.createdAt)} />
          <DetailRow label="Last Updated" value={formatDateTime(wallet.updatedAt)} />
        </div>
      </Card>

      {/* Label Edit */}
      <Card title="Wallet Label">
        {isEditing ? (
          <div className="space-y-4">
            <Input
              placeholder="Enter wallet label"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditLabel(wallet.label || '');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateLabel} isLoading={isLoading} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white">{wallet.label || 'No label set'}</span>
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card title="Actions">
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/sign')}
            className="w-full"
          >
            Sign Transaction
          </Button>

          <Button
            variant="secondary"
            onClick={handleToggleActive}
            isLoading={isLoading}
            className="w-full"
          >
            {wallet.isActive ? 'Archive Wallet' : 'Activate Wallet'}
          </Button>

          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isLoading}
            className="w-full"
          >
            Delete Wallet
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Helper components
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}

// Helper functions
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
