/**
 * Global type declarations
 */

import type { Chain, WalletInfo, UnsignedTransaction, SignedTransaction, AppMode } from './types';

interface WalletRoomAPI {
  app: {
    getMode: () => Promise<AppMode>;
  };
  security: {
    unlock: (password: string) => Promise<boolean>;
    lock: () => Promise<void>;
    isUnlocked: () => Promise<boolean>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: { message: string } }>;
  };
  wallet: {
    createWallet: (params: {
      chain: Chain;
      type: 'cold' | 'warm';
      label?: string;
      derivationPath?: string;
      addressType?: string;
      accountIndex?: number;
    }) => Promise<{ success: boolean; data?: { wallet: WalletInfo; mnemonic: string }; error?: { message: string } }>;
    importWallet: (params: {
      chain: Chain;
      type: 'cold' | 'warm';
      mnemonic: string;
      label?: string;
      derivationPath?: string;
      addressType?: string;
      accountIndex?: number;
    }) => Promise<{ success: boolean; data?: WalletInfo; error?: { message: string } }>;
    listWallets: (filter?: { chain?: Chain; type?: 'cold' | 'warm'; isActive?: boolean }) => Promise<{ success: boolean; data?: WalletInfo[]; error?: { message: string } }>;
    getWallet: (walletId: string) => Promise<{ success: boolean; data?: WalletInfo; error?: { message: string } }>;
    updateWallet: (walletId: string, updates: { label?: string; isActive?: boolean }) => Promise<{ success: boolean; data?: WalletInfo; error?: { message: string } }>;
    deleteWallet: (walletId: string) => Promise<{ success: boolean; error?: { message: string } }>;
    validateAddress: (chain: Chain, address: string) => Promise<boolean>;
  };
  transaction: {
    buildTransaction: (
      params: {
        chain: Chain;
        from: string;
        to: string;
        amount: string;
        memo?: string;
        feeRate?: number;
        gasLimit?: string;
        gasPrice?: string;
        destinationTag?: number;
      },
      prerequisites: {
        chain: Chain;
        address: string;
        nonce?: number;
        utxos?: unknown[];
        sequence?: number;
        refBlockBytes?: string;
        refBlockHash?: string;
      }
    ) => Promise<{ success: boolean; data?: UnsignedTransaction; error?: { message: string } }>;
    signTransaction: (walletId: string, unsignedTx: UnsignedTransaction) => Promise<{ success: boolean; data?: SignedTransaction; error?: { message: string } }>;
    broadcastTransaction: (signedTx: SignedTransaction) => Promise<{ success: boolean; data?: string; error?: { message: string } }>;
    getHistory: (walletId?: string) => Promise<{ success: boolean; data?: unknown[]; error?: { message: string } }>;
    parseTransaction: (chain: Chain, serialized: string) => Promise<{ success: boolean; data?: Partial<UnsignedTransaction>; error?: { message: string } }>;
    estimateFee: (chain: Chain) => Promise<{ success: boolean; data?: string; error?: { message: string } }>;
  };
}

declare global {
  interface Window {
    walletRoom?: WalletRoomAPI;
  }
}

export {};
