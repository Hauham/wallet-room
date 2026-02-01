/**
 * Wallet-related type definitions
 */

import type { Chain, WalletType } from './common.types';

/** Core wallet information stored in the application */
export interface WalletInfo {
  /** Unique identifier for the wallet */
  id: string;
  /** Blockchain chain type */
  chain: Chain;
  /** Cold or warm wallet classification */
  type: WalletType;
  /** Primary address of the wallet */
  address: string;
  /** Public key in hex format */
  publicKey: string;
  /** HD derivation path used */
  derivationPath: string;
  /** User-defined label for the wallet */
  label?: string;
  /** Creation timestamp in milliseconds */
  createdAt: number;
  /** Last updated timestamp in milliseconds */
  updatedAt: number;
  /** Whether wallet is active or archived */
  isActive: boolean;
  /** BTC-specific: address type */
  addressType?: BtcAddressType;
}

/** BTC address types */
export type BtcAddressType = 'legacy' | 'segwit' | 'native-segwit' | 'taproot';

/** Parameters for creating a new wallet */
export interface CreateWalletParams {
  chain: Chain;
  type: WalletType;
  label?: string;
  /** Optional specific derivation path */
  derivationPath?: string;
  /** BTC-specific: address type */
  addressType?: BtcAddressType;
  /** Optional account index for HD derivation */
  accountIndex?: number;
}

/** Parameters for importing a wallet from mnemonic */
export interface ImportWalletParams extends CreateWalletParams {
  mnemonic: string;
}

/** Encrypted wallet storage format */
export interface EncryptedWalletData {
  id: string;
  /** Encrypted private key data */
  encryptedPrivateKey: string;
  /** Salt used for encryption */
  salt: string;
  /** Initialization vector */
  iv: string;
  /** Key derivation iterations */
  iterations: number;
  /** Encryption algorithm used */
  algorithm: string;
}

/** Wallet balance information */
export interface WalletBalance {
  walletId: string;
  chain: Chain;
  /** Balance in smallest unit (satoshi, wei, drops, sun) */
  balance: string;
  /** Balance in human-readable format */
  balanceFormatted: string;
  /** USD equivalent if available */
  balanceUsd?: string;
  /** Last updated timestamp */
  updatedAt: number;
}

/** Wallet with balance information */
export interface WalletWithBalance extends WalletInfo {
  balance?: WalletBalance;
}

/** Wallet export format for backup */
export interface WalletExport {
  version: string;
  exportedAt: number;
  wallets: Array<{
    info: WalletInfo;
    encryptedData?: EncryptedWalletData;
  }>;
  checksum: string;
}
