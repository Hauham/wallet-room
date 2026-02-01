/**
 * External Key Provider
 * Manages wallets with private keys stored externally (offline signer)
 * Only stores public keys and addresses locally
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Chain,
  WalletInfo,
  UnsignedTransaction,
  SignedTransaction,
  CreateWalletParams,
  ImportWalletParams,
} from '@/types';
import type { IKeyProvider, QRData, FileData } from './key-provider.interface';
import { checksum } from '@/utils/crypto';

/** Storage interface for watch-only wallet persistence */
interface IWatchOnlyStorage {
  getWallets(): Promise<WalletInfo[]>;
  saveWallet(wallet: WalletInfo): Promise<void>;
  deleteWallet(id: string): Promise<void>;
}

/**
 * In-memory storage for development
 */
class MemoryWatchOnlyStorage implements IWatchOnlyStorage {
  private wallets: Map<string, WalletInfo> = new Map();

  async getWallets(): Promise<WalletInfo[]> {
    return Array.from(this.wallets.values());
  }

  async saveWallet(wallet: WalletInfo): Promise<void> {
    this.wallets.set(wallet.id, wallet);
  }

  async deleteWallet(id: string): Promise<void> {
    this.wallets.delete(id);
  }
}

/** Air-gap payload structure */
interface AirGapPayload {
  version: string;
  type: 'unsigned_tx' | 'signed_tx' | 'public_key' | 'address';
  chain: Chain;
  data: string;
  checksum: string;
  timestamp: number;
}

/**
 * External Key Provider Implementation
 * Used when private keys are stored in a separate offline device
 */
export class ExternalKeyProvider implements IKeyProvider {
  readonly type = 'external' as const;
  readonly hasLocalKeys = false;

  private storage: IWatchOnlyStorage;
  private pendingTransactions: Map<string, UnsignedTransaction> = new Map();

  constructor(storage?: IWatchOnlyStorage) {
    this.storage = storage || new MemoryWatchOnlyStorage();
  }

  /**
   * Generates wallet - Not supported for external provider
   * Wallets must be created on the offline signer
   */
  async generateWallet(): Promise<{ wallet: WalletInfo; mnemonic: string }> {
    throw new Error(
      'External key provider cannot generate wallets. ' +
      'Create wallet on offline signer and import public key.'
    );
  }

  /**
   * Imports wallet - Only accepts public key data
   * Private key stays on external signer
   */
  async importWallet(params: ImportWalletParams): Promise<WalletInfo> {
    // For external provider, mnemonic field contains public key or QR data
    throw new Error(
      'Use importFromQR or importPublicKey for external key provider'
    );
  }

  /**
   * Imports a wallet from public key data
   * @param chain - Target chain
   * @param publicKey - Public key in hex format
   * @param address - Pre-computed address
   * @param derivationPath - Derivation path used
   * @param label - Optional label
   * @returns Wallet info
   */
  async importPublicKey(
    chain: Chain,
    publicKey: string,
    address: string,
    derivationPath: string,
    label?: string
  ): Promise<WalletInfo> {
    const walletId = uuidv4();
    const now = Date.now();

    const wallet: WalletInfo = {
      id: walletId,
      chain,
      type: 'cold', // External keys are always cold wallets
      address,
      publicKey,
      derivationPath,
      label,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await this.storage.saveWallet(wallet);
    return wallet;
  }

  /**
   * Imports wallet from QR code data
   */
  async importFromQR(qrData: string): Promise<WalletInfo> {
    const payload = JSON.parse(qrData) as AirGapPayload;

    // Verify checksum
    const calculatedChecksum = checksum(payload.data);
    if (calculatedChecksum !== payload.checksum) {
      throw new Error('QR data checksum mismatch');
    }

    if (payload.type !== 'public_key' && payload.type !== 'address') {
      throw new Error('Invalid QR type for wallet import');
    }

    const data = JSON.parse(Buffer.from(payload.data, 'base64').toString());

    return this.importPublicKey(
      payload.chain,
      data.publicKey,
      data.address,
      data.derivationPath,
      data.label
    );
  }

  /**
   * Gets public key for a wallet
   */
  async getPublicKey(walletId: string): Promise<string> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    return wallet.publicKey;
  }

  /**
   * Gets address for a wallet
   */
  async getAddress(walletId: string): Promise<string> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    return wallet.address;
  }

  /**
   * Lists all wallets
   */
  async listWallets(): Promise<WalletInfo[]> {
    return this.storage.getWallets();
  }

  /**
   * Gets a specific wallet
   */
  async getWallet(walletId: string): Promise<WalletInfo | undefined> {
    const wallets = await this.storage.getWallets();
    return wallets.find((w) => w.id === walletId);
  }

  /**
   * Deletes a wallet
   */
  async deleteWallet(walletId: string): Promise<void> {
    this.pendingTransactions.delete(walletId);
    await this.storage.deleteWallet(walletId);
  }

  /**
   * Sign transaction - Not directly supported
   * Must use exportForSigning and importSignedTransaction
   */
  async signTransaction(): Promise<SignedTransaction> {
    throw new Error(
      'External key provider cannot sign directly. ' +
      'Use exportForSigning() and importSignedTransaction().'
    );
  }

  /**
   * Exports unsigned transaction for external signing
   */
  async exportForSigning(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<QRData> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    // Store pending transaction
    this.pendingTransactions.set(unsignedTx.id, unsignedTx);

    // Create payload
    const dataStr = JSON.stringify({
      walletId,
      publicKey: wallet.publicKey,
      address: wallet.address,
      transaction: unsignedTx,
    });

    const data = Buffer.from(dataStr).toString('base64');

    const payload: AirGapPayload = {
      version: '1.0',
      type: 'unsigned_tx',
      chain: unsignedTx.chain,
      data,
      checksum: checksum(data),
      timestamp: Date.now(),
    };

    return {
      type: 'qr',
      data: JSON.stringify(payload),
    };
  }

  /**
   * Imports signed transaction from external signer
   */
  async importSignedTransaction(
    data: QRData | FileData
  ): Promise<SignedTransaction> {
    const content = data.type === 'qr' ? data.data : data.content;
    const payload = JSON.parse(content) as AirGapPayload;

    // Verify checksum
    const calculatedChecksum = checksum(payload.data);
    if (calculatedChecksum !== payload.checksum) {
      throw new Error('Signed transaction checksum mismatch');
    }

    if (payload.type !== 'signed_tx') {
      throw new Error('Invalid payload type for signed transaction');
    }

    const signedTx = JSON.parse(
      Buffer.from(payload.data, 'base64').toString()
    ) as SignedTransaction;

    // Verify we have the pending transaction
    const pendingTx = this.pendingTransactions.get(signedTx.unsignedTxId);
    if (!pendingTx) {
      throw new Error(
        'No matching pending transaction found. ' +
        'Ensure you exported this transaction first.'
      );
    }

    // Clear pending transaction
    this.pendingTransactions.delete(signedTx.unsignedTxId);

    return signedTx;
  }

  /**
   * External provider is always "unlocked" since it has no private keys
   */
  async isUnlocked(): Promise<boolean> {
    return true;
  }

  /**
   * No-op for external provider
   */
  async unlock(): Promise<boolean> {
    return true;
  }

  /**
   * No-op for external provider
   */
  async lock(): Promise<void> {
    // No sensitive data to clear
  }
}
