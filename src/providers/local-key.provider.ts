/**
 * Local Key Provider
 * Stores encrypted private keys locally in the application
 */

import * as bip39 from 'bip39';
import { v4 as uuidv4 } from 'uuid';
import type {
  Chain,
  WalletInfo,
  UnsignedTransaction,
  SignedTransaction,
  CreateWalletParams,
  ImportWalletParams,
  EncryptedWalletData,
} from '@/types';
import { DERIVATION_PATHS } from '@/types';
import type { IKeyProvider } from './key-provider.interface';
import { getChainService } from '@/chains';
import { encrypt, decrypt, verifyPassword, hashPassword } from '@/utils/crypto';

/** Internal wallet data structure */
interface InternalWalletData {
  info: WalletInfo;
  encrypted: EncryptedWalletData;
}

/** Storage interface for wallet persistence */
interface IWalletStorage {
  getWallets(): Promise<InternalWalletData[]>;
  saveWallet(data: InternalWalletData): Promise<void>;
  deleteWallet(id: string): Promise<void>;
  getPasswordHash(): Promise<{ hash: string; salt: string } | null>;
  setPasswordHash(hash: string, salt: string): Promise<void>;
}

/**
 * In-memory storage for development
 * Will be replaced with electron-store in production
 */
class MemoryStorage implements IWalletStorage {
  private wallets: Map<string, InternalWalletData> = new Map();
  private passwordData: { hash: string; salt: string } | null = null;

  async getWallets(): Promise<InternalWalletData[]> {
    return Array.from(this.wallets.values());
  }

  async saveWallet(data: InternalWalletData): Promise<void> {
    this.wallets.set(data.info.id, data);
  }

  async deleteWallet(id: string): Promise<void> {
    this.wallets.delete(id);
  }

  async getPasswordHash(): Promise<{ hash: string; salt: string } | null> {
    return this.passwordData;
  }

  async setPasswordHash(hash: string, salt: string): Promise<void> {
    this.passwordData = { hash, salt };
  }
}

/**
 * Local Key Provider Implementation
 * Manages encrypted private keys stored locally
 */
export class LocalKeyProvider implements IKeyProvider {
  readonly type = 'local' as const;
  readonly hasLocalKeys = true;

  private storage: IWalletStorage;
  private password: string | null = null;
  private decryptedKeys: Map<string, string> = new Map();

  constructor(storage?: IWalletStorage) {
    this.storage = storage || new MemoryStorage();
  }

  /**
   * Generates a new wallet with a fresh mnemonic
   */
  async generateWallet(
    params: CreateWalletParams
  ): Promise<{ wallet: WalletInfo; mnemonic: string }> {
    if (!this.password) {
      throw new Error('Provider is locked. Please unlock first.');
    }

    // Generate mnemonic
    const mnemonic = bip39.generateMnemonic(256); // 24 words

    // Create wallet from mnemonic
    const wallet = await this.createWalletFromMnemonic(mnemonic, params);

    return { wallet, mnemonic };
  }

  /**
   * Imports a wallet from an existing mnemonic
   */
  async importWallet(params: ImportWalletParams): Promise<WalletInfo> {
    if (!this.password) {
      throw new Error('Provider is locked. Please unlock first.');
    }

    // Validate mnemonic
    if (!bip39.validateMnemonic(params.mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    return this.createWalletFromMnemonic(params.mnemonic, params);
  }

  /**
   * Creates and stores a wallet from a mnemonic
   */
  private async createWalletFromMnemonic(
    mnemonic: string,
    params: CreateWalletParams
  ): Promise<WalletInfo> {
    const { chain, type, label, derivationPath, addressType, accountIndex = 0 } = params;

    // Get derivation path
    const basePath = derivationPath || this.getDefaultPath(chain, addressType);
    const fullPath = `${basePath}/${accountIndex}`;

    // Convert mnemonic to seed
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Get chain service and derive wallet
    const chainService = getChainService(chain);
    const derived = chainService.deriveFromSeed(
      Buffer.from(seed),
      fullPath,
      { addressType }
    );

    if (!derived.privateKey) {
      throw new Error('Failed to derive private key');
    }

    // Create wallet info
    const walletId = uuidv4();
    const now = Date.now();

    const walletInfo: WalletInfo = {
      id: walletId,
      chain,
      type,
      address: derived.address,
      publicKey: derived.publicKey,
      derivationPath: fullPath,
      label,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      addressType: chain === 'BTC' ? addressType : undefined,
    };

    // Encrypt private key
    const encryptedData = await this.encryptPrivateKey(walletId, derived.privateKey);

    // Store wallet
    await this.storage.saveWallet({
      info: walletInfo,
      encrypted: encryptedData,
    });

    // Cache decrypted key
    this.decryptedKeys.set(walletId, derived.privateKey);

    return walletInfo;
  }

  /**
   * Gets the default derivation path for a chain
   */
  private getDefaultPath(chain: Chain, addressType?: string): string {
    const paths = DERIVATION_PATHS[chain];

    if (chain === 'BTC' && addressType) {
      const pathKey = addressType === 'native-segwit' ? 'nativeSegwit' : addressType;
      return paths[pathKey] || paths['nativeSegwit'];
    }

    return paths['default'] || Object.values(paths)[0];
  }

  /**
   * Encrypts a private key for storage
   */
  private async encryptPrivateKey(
    walletId: string,
    privateKey: string
  ): Promise<EncryptedWalletData> {
    if (!this.password) {
      throw new Error('Provider is locked');
    }

    const encrypted = await encrypt(privateKey, this.password);

    return {
      id: walletId,
      encryptedPrivateKey: encrypted.ciphertext,
      salt: encrypted.salt,
      iv: encrypted.iv,
      iterations: encrypted.iterations,
      algorithm: encrypted.algorithm,
    };
  }

  /**
   * Decrypts a private key from storage
   */
  private async decryptPrivateKey(
    encrypted: EncryptedWalletData
  ): Promise<string> {
    if (!this.password) {
      throw new Error('Provider is locked');
    }

    return decrypt(
      encrypted.encryptedPrivateKey,
      this.password,
      encrypted.salt,
      encrypted.iv,
      encrypted.iterations
    );
  }

  /**
   * Gets the public key for a wallet
   */
  async getPublicKey(walletId: string): Promise<string> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    return wallet.publicKey;
  }

  /**
   * Gets the address for a wallet
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
    const wallets = await this.storage.getWallets();
    return wallets.map((w) => w.info);
  }

  /**
   * Gets a specific wallet by ID
   */
  async getWallet(walletId: string): Promise<WalletInfo | undefined> {
    const wallets = await this.storage.getWallets();
    const found = wallets.find((w) => w.info.id === walletId);
    return found?.info;
  }

  /**
   * Deletes a wallet
   */
  async deleteWallet(walletId: string): Promise<void> {
    this.decryptedKeys.delete(walletId);
    await this.storage.deleteWallet(walletId);
  }

  /**
   * Signs a transaction
   */
  async signTransaction(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<SignedTransaction> {
    if (!this.password) {
      throw new Error('Provider is locked. Please unlock first.');
    }

    // Get private key (from cache or decrypt)
    let privateKey = this.decryptedKeys.get(walletId);

    if (!privateKey) {
      const wallets = await this.storage.getWallets();
      const wallet = wallets.find((w) => w.info.id === walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
      }

      privateKey = await this.decryptPrivateKey(wallet.encrypted);
      this.decryptedKeys.set(walletId, privateKey);
    }

    // Get chain service and sign
    const chainService = getChainService(unsignedTx.chain);
    const signedTx = await chainService.signTransaction(unsignedTx, privateKey);

    return signedTx;
  }

  /**
   * Checks if provider is unlocked
   */
  async isUnlocked(): Promise<boolean> {
    return this.password !== null;
  }

  /**
   * Unlocks the provider with a password
   */
  async unlock(password: string): Promise<boolean> {
    const storedHash = await this.storage.getPasswordHash();

    if (!storedHash) {
      // First time setup - set the password
      const { hash, salt } = hashPassword(password);
      await this.storage.setPasswordHash(hash, salt);
      this.password = password;
      return true;
    }

    // Verify password
    if (verifyPassword(password, storedHash.hash, storedHash.salt)) {
      this.password = password;
      return true;
    }

    return false;
  }

  /**
   * Locks the provider
   */
  async lock(): Promise<void> {
    // Clear sensitive data
    this.password = null;
    this.decryptedKeys.clear();
  }

  /**
   * Changes the encryption password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Verify current password
    const storedHash = await this.storage.getPasswordHash();
    if (!storedHash || !verifyPassword(currentPassword, storedHash.hash, storedHash.salt)) {
      throw new Error('Current password is incorrect');
    }

    // Re-encrypt all wallets with new password
    const wallets = await this.storage.getWallets();

    for (const wallet of wallets) {
      // Decrypt with old password
      const privateKey = await decrypt(
        wallet.encrypted.encryptedPrivateKey,
        currentPassword,
        wallet.encrypted.salt,
        wallet.encrypted.iv,
        wallet.encrypted.iterations
      );

      // Encrypt with new password
      const encrypted = await encrypt(privateKey, newPassword);

      wallet.encrypted = {
        id: wallet.info.id,
        encryptedPrivateKey: encrypted.ciphertext,
        salt: encrypted.salt,
        iv: encrypted.iv,
        iterations: encrypted.iterations,
        algorithm: encrypted.algorithm,
      };

      await this.storage.saveWallet(wallet);
    }

    // Update password hash
    const { hash, salt } = hashPassword(newPassword);
    await this.storage.setPasswordHash(hash, salt);

    // Update cached password
    this.password = newPassword;
  }
}
