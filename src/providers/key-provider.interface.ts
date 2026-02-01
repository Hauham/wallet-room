/**
 * Key Provider Interface
 * Abstracts key storage and signing operations
 */

import type {
  Chain,
  KeyProviderType,
  WalletInfo,
  UnsignedTransaction,
  SignedTransaction,
  CreateWalletParams,
  ImportWalletParams,
} from '@/types';

/** Data format for QR code transfer */
export interface QRData {
  type: 'qr';
  data: string;
  frames?: number;
}

/** Data format for file transfer */
export interface FileData {
  type: 'file';
  filename: string;
  content: string;
}

/**
 * Key Provider Interface
 * All key storage implementations must implement this interface
 */
export interface IKeyProvider {
  /** Type identifier for this provider */
  readonly type: KeyProviderType;

  /** Whether this provider stores private keys locally */
  readonly hasLocalKeys: boolean;

  // ============ Wallet Operations ============

  /**
   * Generates a new wallet with a new mnemonic
   * @param params - Wallet creation parameters
   * @returns Created wallet information
   */
  generateWallet(params: CreateWalletParams): Promise<{
    wallet: WalletInfo;
    mnemonic: string;
  }>;

  /**
   * Imports a wallet from an existing mnemonic
   * @param params - Import parameters including mnemonic
   * @returns Imported wallet information
   */
  importWallet(params: ImportWalletParams): Promise<WalletInfo>;

  /**
   * Gets the public key for a wallet
   * @param walletId - Wallet identifier
   * @returns Public key in hex format
   */
  getPublicKey(walletId: string): Promise<string>;

  /**
   * Gets the address for a wallet
   * @param walletId - Wallet identifier
   * @returns Wallet address
   */
  getAddress(walletId: string): Promise<string>;

  /**
   * Lists all wallets managed by this provider
   * @returns Array of wallet information
   */
  listWallets(): Promise<WalletInfo[]>;

  /**
   * Gets a specific wallet by ID
   * @param walletId - Wallet identifier
   * @returns Wallet information or undefined
   */
  getWallet(walletId: string): Promise<WalletInfo | undefined>;

  /**
   * Deletes a wallet
   * @param walletId - Wallet identifier
   */
  deleteWallet(walletId: string): Promise<void>;

  // ============ Signing Operations ============

  /**
   * Signs a transaction using the wallet's private key
   * @param walletId - Wallet identifier
   * @param unsignedTx - Transaction to sign
   * @returns Signed transaction
   */
  signTransaction(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<SignedTransaction>;

  // ============ External Provider Operations ============

  /**
   * Exports unsigned transaction for external signing
   * Only used by external key providers
   * @param walletId - Wallet identifier
   * @param unsignedTx - Transaction to export
   * @returns QR or file data for transfer
   */
  exportForSigning?(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<QRData | FileData>;

  /**
   * Imports a signed transaction from external signer
   * Only used by external key providers
   * @param data - QR or file data containing signed transaction
   * @returns Signed transaction
   */
  importSignedTransaction?(data: QRData | FileData): Promise<SignedTransaction>;

  // ============ Security Operations ============

  /**
   * Verifies the provider is unlocked and ready
   * @returns true if provider is ready for operations
   */
  isUnlocked(): Promise<boolean>;

  /**
   * Unlocks the provider with a password
   * @param password - User password
   * @returns true if unlock successful
   */
  unlock(password: string): Promise<boolean>;

  /**
   * Locks the provider, clearing sensitive data from memory
   */
  lock(): Promise<void>;

  /**
   * Changes the encryption password
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  changePassword?(currentPassword: string, newPassword: string): Promise<void>;
}

/**
 * Factory function type for creating key providers
 */
export type KeyProviderFactory = () => IKeyProvider;
