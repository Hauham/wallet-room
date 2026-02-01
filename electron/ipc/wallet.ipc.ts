/**
 * Wallet IPC Handlers
 * Handles wallet-related IPC calls from renderer using real crypto operations
 */

import type { IpcMain } from 'electron';
import * as bip39 from 'bip39';
import { v4 as uuidv4 } from 'uuid';
import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import { ethers, HDNodeWallet } from 'ethers';
import { signTransaction as ethSign } from '../../src/chains/eth/eth.transaction';
import { deriveKeypair, deriveAddress as xrplDeriveAddress } from 'xrpl';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import bs58 from 'bs58';
import crypto from 'crypto';

// Initialize libraries
initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

// Types
interface Chain {
  BTC: 'BTC';
  ETH: 'ETH';
  XRP: 'XRP';
  TRON: 'TRON';
}

type ChainType = 'BTC' | 'ETH' | 'XRP' | 'TRON';
type WalletType = 'cold' | 'warm';
type BtcAddressType = 'legacy' | 'segwit' | 'native-segwit' | 'taproot';

interface WalletInfo {
  id: string;
  chain: ChainType;
  type: WalletType;
  address: string;
  publicKey: string;
  derivationPath: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  addressType?: BtcAddressType;
}

interface EncryptedWalletData {
  id: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  iterations: number;
  algorithm: string;
}

interface StoredWallet {
  info: WalletInfo;
  encrypted: EncryptedWalletData;
}

interface CreateWalletParams {
  chain: ChainType;
  type: WalletType;
  label?: string;
  derivationPath?: string;
  addressType?: BtcAddressType;
  accountIndex?: number;
}

interface ImportWalletParams extends CreateWalletParams {
  mnemonic: string;
}

interface WalletFilter {
  chain?: ChainType;
  type?: WalletType;
  isActive?: boolean;
}

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const AUTH_TAG_LENGTH = 16;

// Derivation paths
const DERIVATION_PATHS: Record<ChainType, Record<string, string>> = {
  BTC: {
    legacy: "m/44'/0'/0'/0",
    segwit: "m/49'/0'/0'/0",
    'native-segwit': "m/84'/0'/0'/0",
    taproot: "m/86'/0'/0'/0",
  },
  ETH: { default: "m/44'/60'/0'/0" },
  XRP: { default: "m/44'/144'/0'/0" },
  TRON: { default: "m/44'/195'/0'/0" },
};

/**
 * Real Wallet Service with cryptographic operations
 */
class RealWalletService {
  private wallets: Map<string, StoredWallet> = new Map();
  private decryptedKeys: Map<string, string> = new Map();
  private password: string | null = null;
  private passwordHash: { hash: string; salt: string } | null = null;

  // ============ Encryption Helpers ============

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  private async encrypt(plaintext: string, password: string): Promise<EncryptedWalletData> {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = await this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      id: '',
      encryptedPrivateKey: encrypted + ':' + authTag.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      iterations: ITERATIONS,
      algorithm: ALGORITHM,
    };
  }

  private async decrypt(encrypted: EncryptedWalletData, password: string): Promise<string> {
    const salt = Buffer.from(encrypted.salt, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const key = await this.deriveKey(password, salt);

    const [ciphertext, authTagStr] = encrypted.encryptedPrivateKey.split(':');
    const authTag = Buffer.from(authTagStr, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
    const salt = existingSalt ? Buffer.from(existingSalt, 'base64') : crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.createHash('sha256').update(Buffer.concat([salt, Buffer.from(password)])).digest('base64');
    return { hash, salt: salt.toString('base64') };
  }

  // ============ Chain-specific Derivation ============

  private deriveBtcWallet(
    seed: Buffer,
    derivationPath: string,
    addressType: BtcAddressType = 'native-segwit'
  ): { publicKey: string; address: string; privateKey: string } {
    const network = bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, network);
    const child = root.derivePath(derivationPath);

    if (!child.privateKey || !child.publicKey) {
      throw new Error('Failed to derive BTC keys');
    }

    let address: string;
    const publicKey = child.publicKey;

    switch (addressType) {
      case 'legacy': {
        const payment = bitcoin.payments.p2pkh({ pubkey: publicKey, network });
        address = payment.address!;
        break;
      }
      case 'segwit': {
        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
        const payment = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
        address = payment.address!;
        break;
      }
      case 'native-segwit': {
        const payment = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
        address = payment.address!;
        break;
      }
      case 'taproot': {
        const xOnlyPubKey = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
        const payment = bitcoin.payments.p2tr({ internalPubkey: xOnlyPubKey, network });
        address = payment.address!;
        break;
      }
      default:
        throw new Error(`Unsupported address type: ${addressType}`);
    }

    return {
      publicKey: publicKey.toString('hex'),
      address,
      privateKey: child.privateKey.toString('hex'),
    };
  }

  private deriveEthWallet(
    seed: Buffer,
    derivationPath: string
  ): { publicKey: string; address: string; privateKey: string } {
    const hdNode = HDNodeWallet.fromSeed(seed);
    const derived = hdNode.derivePath(derivationPath);

    return {
      publicKey: derived.publicKey,
      address: derived.address,
      privateKey: derived.privateKey,
    };
  }

  private deriveXrpWallet(
    seed: Buffer,
    derivationPath: string
  ): { publicKey: string; address: string; privateKey: string } {
    const root = bip32.fromSeed(seed);
    const derived = root.derivePath(derivationPath);

    if (!derived.privateKey) {
      throw new Error('Failed to derive XRP private key');
    }

    const privateKeyHex = derived.privateKey.toString('hex').toUpperCase();
    const keypair = deriveKeypair('00' + privateKeyHex);
    const address = xrplDeriveAddress(keypair.publicKey);

    return {
      publicKey: keypair.publicKey,
      address,
      privateKey: privateKeyHex,
    };
  }

  private deriveTronWallet(
    seed: Buffer,
    derivationPath: string
  ): { publicKey: string; address: string; privateKey: string } {
    const root = bip32.fromSeed(seed);
    const derived = root.derivePath(derivationPath);

    if (!derived.privateKey) {
      throw new Error('Failed to derive TRON private key');
    }

    // Get uncompressed public key
    const uncompressedPubKey = Buffer.from(ecc.pointFromScalar(derived.privateKey, false)!);
    const pubKeyWithoutPrefix = uncompressedPubKey.slice(1);

    // Keccak256 hash and take last 20 bytes
    const hash = keccak_256(pubKeyWithoutPrefix);
    const addressBytes = hash.slice(-20);

    // Add TRON prefix (0x41) and calculate checksum
    const addressWithPrefix = Buffer.concat([Buffer.from([0x41]), Buffer.from(addressBytes)]);
    const checksumHash = sha256(sha256(addressWithPrefix));
    const checksum = checksumHash.slice(0, 4);
    const addressWithChecksum = Buffer.concat([addressWithPrefix, Buffer.from(checksum)]);

    return {
      publicKey: derived.publicKey!.toString('hex'),
      address: bs58.encode(addressWithChecksum),
      privateKey: derived.privateKey.toString('hex'),
    };
  }

  private deriveWallet(
    seed: Buffer,
    chain: ChainType,
    derivationPath: string,
    addressType?: BtcAddressType
  ): { publicKey: string; address: string; privateKey: string } {
    switch (chain) {
      case 'BTC':
        return this.deriveBtcWallet(seed, derivationPath, addressType);
      case 'ETH':
        return this.deriveEthWallet(seed, derivationPath);
      case 'XRP':
        return this.deriveXrpWallet(seed, derivationPath);
      case 'TRON':
        return this.deriveTronWallet(seed, derivationPath);
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  private getDerivationPath(chain: ChainType, addressType?: BtcAddressType, accountIndex: number = 0): string {
    const paths = DERIVATION_PATHS[chain];
    let basePath: string;

    if (chain === 'BTC' && addressType) {
      basePath = paths[addressType] || paths['native-segwit'];
    } else {
      basePath = paths['default'] || Object.values(paths)[0];
    }

    return `${basePath}/${accountIndex}`;
  }

  // ============ Address Validation ============

  validateAddress(chain: ChainType, address: string): boolean {
    if (!address) return false;

    switch (chain) {
      case 'BTC':
        try {
          bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
          return true;
        } catch {
          return false;
        }
      case 'ETH':
        return ethers.isAddress(address);
      case 'XRP':
        return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
      case 'TRON':
        if (!address.startsWith('T') || address.length !== 34) return false;
        try {
          const decoded = bs58.decode(address);
          if (decoded.length !== 25 || decoded[0] !== 0x41) return false;
          const addressBytes = decoded.slice(0, 21);
          const checksum = decoded.slice(21);
          const hash = sha256(sha256(addressBytes));
          return Buffer.from(checksum).equals(Buffer.from(hash.slice(0, 4)));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  // ============ Wallet Operations ============

  async createWallet(params: CreateWalletParams): Promise<{ success: boolean; data?: { wallet: WalletInfo; mnemonic: string }; error?: { message: string } }> {
    if (!this.password) {
      return { success: false, error: { message: 'Wallet is locked. Please unlock first.' } };
    }

    try {
      // Generate 24-word mnemonic
      const mnemonic = bip39.generateMnemonic(256);
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const derivationPath = params.derivationPath || this.getDerivationPath(params.chain, params.addressType, params.accountIndex);
      const derived = this.deriveWallet(Buffer.from(seed), params.chain, derivationPath, params.addressType);

      const walletId = uuidv4();
      const now = Date.now();

      const walletInfo: WalletInfo = {
        id: walletId,
        chain: params.chain,
        type: params.type,
        address: derived.address,
        publicKey: derived.publicKey,
        derivationPath,
        label: params.label,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        addressType: params.chain === 'BTC' ? params.addressType : undefined,
      };

      // Encrypt private key
      const encryptedData = await this.encrypt(derived.privateKey, this.password);
      encryptedData.id = walletId;

      // Store wallet
      this.wallets.set(walletId, { info: walletInfo, encrypted: encryptedData });
      this.decryptedKeys.set(walletId, derived.privateKey);

      console.log(`[WalletService] Created ${params.chain} wallet: ${derived.address}`);

      return { success: true, data: { wallet: walletInfo, mnemonic } };
    } catch (error) {
      console.error('[WalletService] Create wallet error:', error);
      return { success: false, error: { message: error instanceof Error ? error.message : 'Failed to create wallet' } };
    }
  }

  async importWallet(params: ImportWalletParams): Promise<{ success: boolean; data?: WalletInfo; error?: { message: string } }> {
    if (!this.password) {
      return { success: false, error: { message: 'Wallet is locked. Please unlock first.' } };
    }

    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(params.mnemonic)) {
        return { success: false, error: { message: 'Invalid mnemonic phrase' } };
      }

      const seed = await bip39.mnemonicToSeed(params.mnemonic);
      const derivationPath = params.derivationPath || this.getDerivationPath(params.chain, params.addressType, params.accountIndex);
      const derived = this.deriveWallet(Buffer.from(seed), params.chain, derivationPath, params.addressType);

      const walletId = uuidv4();
      const now = Date.now();

      const walletInfo: WalletInfo = {
        id: walletId,
        chain: params.chain,
        type: params.type,
        address: derived.address,
        publicKey: derived.publicKey,
        derivationPath,
        label: params.label,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        addressType: params.chain === 'BTC' ? params.addressType : undefined,
      };

      // Encrypt private key
      const encryptedData = await this.encrypt(derived.privateKey, this.password);
      encryptedData.id = walletId;

      // Store wallet
      this.wallets.set(walletId, { info: walletInfo, encrypted: encryptedData });
      this.decryptedKeys.set(walletId, derived.privateKey);

      console.log(`[WalletService] Imported ${params.chain} wallet: ${derived.address}`);

      return { success: true, data: walletInfo };
    } catch (error) {
      console.error('[WalletService] Import wallet error:', error);
      return { success: false, error: { message: error instanceof Error ? error.message : 'Failed to import wallet' } };
    }
  }

  async listWallets(filter?: WalletFilter): Promise<WalletInfo[]> {
    let wallets = Array.from(this.wallets.values()).map(w => w.info);

    if (filter) {
      if (filter.chain) {
        wallets = wallets.filter(w => w.chain === filter.chain);
      }
      if (filter.type) {
        wallets = wallets.filter(w => w.type === filter.type);
      }
      if (filter.isActive !== undefined) {
        wallets = wallets.filter(w => w.isActive === filter.isActive);
      }
    }

    return wallets;
  }

  async getWallet(walletId: string): Promise<WalletInfo | undefined> {
    return this.wallets.get(walletId)?.info;
  }

  async getPrivateKey(walletId: string): Promise<string | undefined> {
    if (!this.password) return undefined;

    // Check cache first
    let privateKey = this.decryptedKeys.get(walletId);
    if (privateKey) return privateKey;

    // Decrypt from storage
    const wallet = this.wallets.get(walletId);
    if (!wallet) return undefined;

    try {
      privateKey = await this.decrypt(wallet.encrypted, this.password);
      this.decryptedKeys.set(walletId, privateKey);
      return privateKey;
    } catch {
      return undefined;
    }
  }

  async updateWallet(walletId: string, updates: { label?: string; isActive?: boolean }): Promise<{ success: boolean; data?: WalletInfo; error?: { message: string } }> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      return { success: false, error: { message: 'Wallet not found' } };
    }

    wallet.info = { ...wallet.info, ...updates, updatedAt: Date.now() };
    this.wallets.set(walletId, wallet);

    return { success: true, data: wallet.info };
  }

  async deleteWallet(walletId: string): Promise<{ success: boolean; error?: { message: string } }> {
    if (this.wallets.has(walletId)) {
      this.wallets.delete(walletId);
      this.decryptedKeys.delete(walletId);
      return { success: true };
    }
    return { success: false, error: { message: 'Wallet not found' } };
  }

  // ============ Security Operations ============

  async unlock(password: string): Promise<boolean> {
    if (!this.passwordHash) {
      // First time - set password
      this.passwordHash = this.hashPassword(password);
      this.password = password;
      console.log('[WalletService] Password set for first time');
      return true;
    }

    // Verify password
    const { hash } = this.hashPassword(password, this.passwordHash.salt);
    if (hash === this.passwordHash.hash) {
      this.password = password;
      console.log('[WalletService] Unlocked successfully');
      return true;
    }

    console.log('[WalletService] Incorrect password');
    return false;
  }

  async lock(): Promise<void> {
    this.password = null;
    this.decryptedKeys.clear();
    console.log('[WalletService] Locked');
  }

  async isUnlocked(): Promise<boolean> {
    return this.password !== null;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: { message: string } }> {
    if (!this.passwordHash) {
      return { success: false, error: { message: 'No password set' } };
    }

    const { hash } = this.hashPassword(currentPassword, this.passwordHash.salt);
    if (hash !== this.passwordHash.hash) {
      return { success: false, error: { message: 'Current password is incorrect' } };
    }

    // Re-encrypt all wallets with new password
    for (const [walletId, wallet] of this.wallets) {
      const privateKey = await this.decrypt(wallet.encrypted, currentPassword);
      const newEncrypted = await this.encrypt(privateKey, newPassword);
      newEncrypted.id = walletId;
      wallet.encrypted = newEncrypted;
    }

    this.passwordHash = this.hashPassword(newPassword);
    this.password = newPassword;

    return { success: true };
  }

  /**
   * Signs a transaction using a stored wallet's private key (used by transaction IPC)
   * Returns a SignedTransaction-like object or an error structure
   */
  async signTransactionWithWallet(
    walletId: string,
    unsignedTx: any
  ): Promise<{ success: boolean; data?: any; error?: { message: string } }> {
    try {
      const stored = this.wallets.get(walletId);
      if (!stored) {
        return { success: false, error: { message: 'Wallet not found' } };
      }

      if (!this.password && !this.decryptedKeys.has(walletId)) {
        return { success: false, error: { message: 'Wallet locked' } };
      }

      let privateKey = this.decryptedKeys.get(walletId);
      if (!privateKey) {
        privateKey = await this.decrypt(stored.encrypted, this.password!);
        this.decryptedKeys.set(walletId, privateKey);
      }

      // Use ETH-specific signer when chain is ETH
      if (unsignedTx.chain === 'ETH') {
        const signed = ethSign(unsignedTx, privateKey);
        return { success: true, data: signed };
      }

      // For other chains, return a not-implemented error
      return { success: false, error: { message: 'Sign for this chain not implemented in wallet service' } };
    } catch (err) {
      return { success: false, error: { message: err instanceof Error ? err.message : 'Failed to sign transaction' } };
    }
  }
}

// Singleton service instance
const walletService = new RealWalletService();

// Export for use by transaction IPC
export { walletService };

/**
 * Sets up wallet IPC handlers
 */
export function setupWalletIpc(ipcMain: IpcMain): void {
  ipcMain.handle('wallet:create', async (_, params: CreateWalletParams) => {
    try {
      return await walletService.createWallet(params);
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  ipcMain.handle('wallet:import', async (_, params: ImportWalletParams) => {
    try {
      return await walletService.importWallet(params);
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  ipcMain.handle('wallet:list', async (_, filter?: WalletFilter) => {
    try {
      const wallets = await walletService.listWallets(filter);
      return { success: true, data: wallets };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  ipcMain.handle('wallet:get', async (_, walletId: string) => {
    try {
      const wallet = await walletService.getWallet(walletId);
      if (wallet) {
        return { success: true, data: wallet };
      }
      return { success: false, error: { message: 'Wallet not found' } };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  ipcMain.handle(
    'wallet:update',
    async (_, walletId: string, updates: { label?: string; isActive?: boolean }) => {
      return walletService.updateWallet(walletId, updates);
    }
  );

  ipcMain.handle('wallet:delete', async (_, walletId: string) => {
    return walletService.deleteWallet(walletId);
  });

  ipcMain.handle('wallet:validateAddress', (_, chain: ChainType, address: string) => {
    return walletService.validateAddress(chain, address);
  });

  // Security handlers
  ipcMain.handle('security:unlock', async (_, password: string) => {
    return walletService.unlock(password);
  });

  ipcMain.handle('security:lock', async () => {
    await walletService.lock();
    return true;
  });

  ipcMain.handle('security:isUnlocked', async () => {
    return walletService.isUnlocked();
  });

  ipcMain.handle(
    'security:changePassword',
    async (_, currentPassword: string, newPassword: string) => {
      return walletService.changePassword(currentPassword, newPassword);
    }
  );
}
