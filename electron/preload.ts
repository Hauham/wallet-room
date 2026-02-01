/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

/** Wallet API exposed to renderer */
const walletApi = {
  // Wallet operations
  createWallet: (params: unknown) =>
    ipcRenderer.invoke('wallet:create', params),
  importWallet: (params: unknown) =>
    ipcRenderer.invoke('wallet:import', params),
  listWallets: (filter?: unknown) =>
    ipcRenderer.invoke('wallet:list', filter),
  getWallet: (walletId: string) =>
    ipcRenderer.invoke('wallet:get', walletId),
  updateWallet: (walletId: string, updates: unknown) =>
    ipcRenderer.invoke('wallet:update', walletId, updates),
  deleteWallet: (walletId: string) =>
    ipcRenderer.invoke('wallet:delete', walletId),
  validateAddress: (chain: string, address: string) =>
    ipcRenderer.invoke('wallet:validateAddress', chain, address),
};

/** Transaction API exposed to renderer */
const transactionApi = {
  // Transaction operations
  buildTransaction: (params: unknown, prerequisites: unknown) =>
    ipcRenderer.invoke('transaction:build', params, prerequisites),
  signTransaction: (walletId: string, unsignedTx: unknown) =>
    ipcRenderer.invoke('transaction:sign', walletId, unsignedTx),
  broadcastTransaction: (signedTx: unknown) =>
    ipcRenderer.invoke('transaction:broadcast', signedTx),
  getHistory: (walletId?: string) =>
    ipcRenderer.invoke('transaction:history', walletId),
  parseTransaction: (chain: string, serialized: string) =>
    ipcRenderer.invoke('transaction:parse', chain, serialized),
  estimateFee: (chain: string, params: unknown) =>
    ipcRenderer.invoke('transaction:estimateFee', chain, params),
};

/** Security API exposed to renderer */
const securityApi = {
  // Provider operations
  unlock: (password: string) =>
    ipcRenderer.invoke('security:unlock', password),
  lock: () =>
    ipcRenderer.invoke('security:lock'),
  isUnlocked: () =>
    ipcRenderer.invoke('security:isUnlocked'),
  changePassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('security:changePassword', currentPassword, newPassword),
};

/** QR Code API exposed to renderer */
const qrApi = {
  // QR operations
  exportForSigning: (walletId: string, unsignedTx: unknown) =>
    ipcRenderer.invoke('qr:exportForSigning', walletId, unsignedTx),
  importSignedTransaction: (data: unknown) =>
    ipcRenderer.invoke('qr:importSignedTransaction', data),
  exportPublicKey: (walletId: string) =>
    ipcRenderer.invoke('qr:exportPublicKey', walletId),
  importPublicKey: (qrData: string) =>
    ipcRenderer.invoke('qr:importPublicKey', qrData),
};

/** Application API exposed to renderer */
const appApi = {
  getMode: () => ipcRenderer.invoke('app:getMode'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
};

// Expose APIs to renderer
contextBridge.exposeInMainWorld('walletRoom', {
  wallet: walletApi,
  transaction: transactionApi,
  security: securityApi,
  qr: qrApi,
  app: appApi,
});

// Type definitions for renderer
declare global {
  interface Window {
    walletRoom: {
      wallet: typeof walletApi;
      transaction: typeof transactionApi;
      security: typeof securityApi;
      qr: typeof qrApi;
      app: typeof appApi;
    };
  }
}
