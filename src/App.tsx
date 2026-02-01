/**
 * Main Application Component
 * Sets up routing and global providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/contexts';
import { Layout } from '@/components/layout';
import {
  Dashboard,
  Wallets,
  WalletDetail,
  CreateWallet,
  SignTransaction,
  Settings,
  UnlockScreen,
} from '@/pages';

/**
 * Protected route wrapper
 * Redirects to unlock screen if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const { state } = useApp();

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  if (!state.isUnlocked) {
    return <UnlockScreen />;
  }

  return <Layout>{children}</Layout>;
}

/**
 * Loading screen during initialization
 */
function LoadingScreen(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
        <p className="text-slate-400">Loading Wallet Room...</p>
      </div>
    </div>
  );
}

/**
 * Main App with routing
 */
function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallets"
        element={
          <ProtectedRoute>
            <Wallets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet/:id"
        element={
          <ProtectedRoute>
            <WalletDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-wallet"
        element={
          <ProtectedRoute>
            <CreateWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sign"
        element={
          <ProtectedRoute>
            <SignTransaction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Root App component
 */
export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
