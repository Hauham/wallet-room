/**
 * Encrypted Storage for Wallet Data
 * Uses electron-store for persistent storage with encryption
 */

import type {
  WalletInfo,
  EncryptedWalletData,
  TransactionRecord,
  AppConfig,
} from '@/types';

/** Internal wallet data with encrypted keys */
interface StoredWalletData {
  info: WalletInfo;
  encrypted: EncryptedWalletData;
}

/** Storage schema */
interface StoreSchema {
  wallets: StoredWalletData[];
  transactions: TransactionRecord[];
  config: AppConfig;
  passwordHash: { hash: string; salt: string } | null;
  auditLog: AuditLogEntry[];
}

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  walletId?: string;
  chain?: string;
  details?: string;
}

/** Default configuration */
const DEFAULT_CONFIG: AppConfig = {
  mode: 'offline',
  keyProviderType: 'local',
  encryptionEnabled: true,
  autoLockTimeout: 300000, // 5 minutes
  defaultChain: 'BTC',
};

/**
 * Abstract storage interface
 * Allows for different implementations (electron-store, in-memory, etc.)
 */
export interface IEncryptedStore {
  // Wallet operations
  getWallets(): Promise<StoredWalletData[]>;
  getWallet(id: string): Promise<StoredWalletData | undefined>;
  saveWallet(data: StoredWalletData): Promise<void>;
  updateWallet(id: string, updates: Partial<WalletInfo>): Promise<void>;
  deleteWallet(id: string): Promise<void>;

  // Transaction operations
  getTransactions(walletId?: string): Promise<TransactionRecord[]>;
  saveTransaction(tx: TransactionRecord): Promise<void>;
  updateTransaction(id: string, updates: Partial<TransactionRecord>): Promise<void>;

  // Configuration
  getConfig(): Promise<AppConfig>;
  setConfig(config: Partial<AppConfig>): Promise<void>;

  // Password management
  getPasswordHash(): Promise<{ hash: string; salt: string } | null>;
  setPasswordHash(hash: string, salt: string): Promise<void>;

  // Audit log
  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getAuditLog(limit?: number): Promise<AuditLogEntry[]>;

  // Clear all data
  clear(): Promise<void>;
}

/**
 * In-memory storage implementation for development/testing
 */
export class MemoryEncryptedStore implements IEncryptedStore {
  private wallets: Map<string, StoredWalletData> = new Map();
  private transactions: Map<string, TransactionRecord> = new Map();
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private passwordData: { hash: string; salt: string } | null = null;
  private auditLog: AuditLogEntry[] = [];

  async getWallets(): Promise<StoredWalletData[]> {
    return Array.from(this.wallets.values());
  }

  async getWallet(id: string): Promise<StoredWalletData | undefined> {
    return this.wallets.get(id);
  }

  async saveWallet(data: StoredWalletData): Promise<void> {
    this.wallets.set(data.info.id, data);
    await this.addAuditLog({
      action: 'wallet_created',
      walletId: data.info.id,
      chain: data.info.chain,
    });
  }

  async updateWallet(id: string, updates: Partial<WalletInfo>): Promise<void> {
    const wallet = this.wallets.get(id);
    if (wallet) {
      wallet.info = { ...wallet.info, ...updates, updatedAt: Date.now() };
      this.wallets.set(id, wallet);
    }
  }

  async deleteWallet(id: string): Promise<void> {
    const wallet = this.wallets.get(id);
    if (wallet) {
      this.wallets.delete(id);
      await this.addAuditLog({
        action: 'wallet_deleted',
        walletId: id,
        chain: wallet.info.chain,
      });
    }
  }

  async getTransactions(walletId?: string): Promise<TransactionRecord[]> {
    const all = Array.from(this.transactions.values());
    if (walletId) {
      return all.filter((tx) => tx.walletId === walletId);
    }
    return all;
  }

  async saveTransaction(tx: TransactionRecord): Promise<void> {
    this.transactions.set(tx.id, tx);
    await this.addAuditLog({
      action: 'transaction_created',
      walletId: tx.walletId,
      chain: tx.chain,
      details: `txHash: ${tx.txHash}`,
    });
  }

  async updateTransaction(
    id: string,
    updates: Partial<TransactionRecord>
  ): Promise<void> {
    const tx = this.transactions.get(id);
    if (tx) {
      this.transactions.set(id, { ...tx, ...updates });
    }
  }

  async getConfig(): Promise<AppConfig> {
    return { ...this.config };
  }

  async setConfig(config: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async getPasswordHash(): Promise<{ hash: string; salt: string } | null> {
    return this.passwordData;
  }

  async setPasswordHash(hash: string, salt: string): Promise<void> {
    this.passwordData = { hash, salt };
  }

  async addAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    this.auditLog.push({
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  async getAuditLog(limit?: number): Promise<AuditLogEntry[]> {
    const entries = [...this.auditLog].reverse();
    return limit ? entries.slice(0, limit) : entries;
  }

  async clear(): Promise<void> {
    this.wallets.clear();
    this.transactions.clear();
    this.config = { ...DEFAULT_CONFIG };
    this.passwordData = null;
    this.auditLog = [];
  }
}

/**
 * Creates storage instance based on environment
 * In Electron, this would use electron-store
 * For now, uses in-memory storage
 */
export function createStore(): IEncryptedStore {
  // In production with Electron, this would return ElectronStore instance
  // For now, return memory store
  return new MemoryEncryptedStore();
}

// Singleton instance
let storeInstance: IEncryptedStore | null = null;

/**
 * Gets the global store instance
 */
export function getStore(): IEncryptedStore {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
}
