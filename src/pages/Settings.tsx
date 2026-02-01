/**
 * Settings Page
 * Application settings and configuration
 */

import React, { useState } from 'react';
import { useApp } from '@/contexts';
import { Card, Button, Input, Select } from '@/components/common';

export function Settings(): React.ReactElement {
  const { state, lock } = useApp();
  const { mode, config } = state;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.security.changePassword(
          currentPassword,
          newPassword
        );

        if (result.success) {
          setPasswordSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setPasswordError('Failed to change password. Check your current password.');
        }
      } else {
        // Development fallback
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your Wallet Room preferences</p>
      </div>

      {/* Application Info */}
      <Card title="Application">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Mode</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                mode === 'offline'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}
            >
              {mode === 'offline' ? 'Offline (Air-Gapped)' : 'Online'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Key Provider</span>
            <span className="text-white">{config.keyProviderType === 'local' ? 'Local Storage' : 'External Signer'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Encryption</span>
            <span className="text-green-400">
              {config.encryptionEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card title="Security">
        <div className="space-y-6">
          {/* Auto-lock timeout */}
          <div>
            <Select
              label="Auto-Lock Timeout"
              options={[
                { value: '60000', label: '1 minute' },
                { value: '300000', label: '5 minutes' },
                { value: '900000', label: '15 minutes' },
                { value: '1800000', label: '30 minutes' },
                { value: '0', label: 'Never' },
              ]}
              value={config.autoLockTimeout.toString()}
            />
            <p className="text-slate-400 text-sm mt-1">
              Automatically lock the application after inactivity
            </p>
          </div>

          {/* Change Password */}
          <div className="border-t border-slate-700 pt-6">
            <h4 className="text-white font-medium mb-4">Change Password</h4>
            <div className="space-y-3">
              <Input
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {passwordError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  Password changed successfully
                </div>
              )}

              <Button
                onClick={handleChangePassword}
                isLoading={isChangingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Change Password
              </Button>
            </div>
          </div>

          {/* Lock Wallet */}
          <div className="border-t border-slate-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Lock Wallet</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Lock the application and clear sensitive data from memory
                </p>
              </div>
              <Button variant="secondary" onClick={() => lock()}>
                Lock Now
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Default Settings */}
      <Card title="Defaults">
        <div className="space-y-4">
          <Select
            label="Default Chain"
            options={[
              { value: 'BTC', label: 'Bitcoin (BTC)' },
              { value: 'ETH', label: 'Ethereum (ETH)' },
              { value: 'XRP', label: 'XRP Ledger (XRP)' },
              { value: 'TRON', label: 'TRON (TRX)' },
            ]}
            value={config.defaultChain}
          />
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="Danger Zone">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h4 className="text-red-400 font-medium mb-2">Clear All Data</h4>
            <p className="text-slate-400 text-sm mb-4">
              This will permanently delete all wallets and data. Make sure you have
              backed up your mnemonic phrases before proceeding.
            </p>
            <Button variant="danger">Clear All Data</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
