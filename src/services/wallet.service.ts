/**
 * Wallet Service
 * High-level wallet management operations
 */

import type {
  Chain,
  WalletType,
  WalletInfo,
  WalletWithBalance,
  CreateWalletParams,
  ImportWalletParams,
  Result,
  BtcAddressType,
} from '@/types';
import { success, failure } from '@/types';
import type { IKeyProvider } from '@/providers';
import { getChainService } from '@/chains';
import { getStore } from '@/storage';

/**
 * Wallet operation error
 */
export class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

/** Error codes */
export const WalletErrorCodes = {
  PROVIDER_LOCKED: 'PROVIDER_LOCKED',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  GENERATION_FAILED: 'GENERATION_FAILED',
  IMPORT_FAILED: 'IMPORT_FAILED',
} as const;

/**
 * Wallet Service
 * Manages wallet lifecycle and operations
 */
export class WalletService {
  private keyProvider: IKeyProvider;

  constructor(keyProvider: IKeyProvider) {
    this.keyProvider = keyProvider;
  }

  /**
   * Creates a new wallet with a generated mnemonic
   * @param params - Wallet creation parameters
   * @returns Result with wallet info and mnemonic
   */
  async createWallet(
    params: CreateWalletParams
  ): Promise<Result<{ wallet: WalletInfo; mnemonic: string }, WalletError>> {
    try {
      // Validate provider is unlocked
      if (!(await this.keyProvider.isUnlocked())) {
        return failure(
          new WalletError(
            'Key provider is locked',
            WalletErrorCodes.PROVIDER_LOCKED
          )
        );
      }

      // Generate wallet
      const result = await this.keyProvider.generateWallet(params);

      // Log creation
      const store = getStore();
      await store.addAuditLog({
        action: 'wallet_created',
        walletId: result.wallet.id,
        chain: result.wallet.chain,
        details: `Address: ${result.wallet.address}`,
      });

      return success(result);
    } catch (error) {
      return failure(
        new WalletError(
          'Failed to create wallet',
          WalletErrorCodes.GENERATION_FAILED,
          error
        )
      );
    }
  }

  /**
   * Imports a wallet from a mnemonic phrase
   * @param params - Import parameters with mnemonic
   * @returns Result with wallet info
   */
  async importWallet(
    params: ImportWalletParams
  ): Promise<Result<WalletInfo, WalletError>> {
    try {
      if (!(await this.keyProvider.isUnlocked())) {
        return failure(
          new WalletError(
            'Key provider is locked',
            WalletErrorCodes.PROVIDER_LOCKED
          )
        );
      }

      const wallet = await this.keyProvider.importWallet(params);

      const store = getStore();
      await store.addAuditLog({
        action: 'wallet_imported',
        walletId: wallet.id,
        chain: wallet.chain,
        details: `Address: ${wallet.address}`,
      });

      return success(wallet);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = message.includes('mnemonic')
        ? WalletErrorCodes.INVALID_MNEMONIC
        : WalletErrorCodes.IMPORT_FAILED;

      return failure(new WalletError(message, code, error));
    }
  }

  /**
   * Lists all wallets, optionally filtered by chain or type
   * @param filter - Optional filter criteria
   * @returns List of wallets
   */
  async listWallets(filter?: {
    chain?: Chain;
    type?: WalletType;
    isActive?: boolean;
  }): Promise<WalletInfo[]> {
    let wallets = await this.keyProvider.listWallets();

    if (filter) {
      if (filter.chain) {
        wallets = wallets.filter((w) => w.chain === filter.chain);
      }
      if (filter.type) {
        wallets = wallets.filter((w) => w.type === filter.type);
      }
      if (filter.isActive !== undefined) {
        wallets = wallets.filter((w) => w.isActive === filter.isActive);
      }
    }

    return wallets;
  }

  /**
   * Gets a wallet by ID
   * @param walletId - Wallet identifier
   * @returns Wallet info or undefined
   */
  async getWallet(walletId: string): Promise<WalletInfo | undefined> {
    return this.keyProvider.getWallet(walletId);
  }

  /**
   * Gets wallet with balance (online mode only)
   * @param walletId - Wallet identifier
   * @returns Wallet with balance info
   */
  async getWalletWithBalance(
    walletId: string
  ): Promise<Result<WalletWithBalance, WalletError>> {
    try {
      const wallet = await this.keyProvider.getWallet(walletId);

      if (!wallet) {
        return failure(
          new WalletError(
            `Wallet not found: ${walletId}`,
            WalletErrorCodes.WALLET_NOT_FOUND
          )
        );
      }

      // In offline mode, return wallet without balance
      const walletWithBalance: WalletWithBalance = { ...wallet };

      // TODO: In online mode, fetch balance from chain service
      // const chainService = getChainService(wallet.chain);
      // if (chainService.getBalance) {
      //   const balance = await chainService.getBalance(wallet.address);
      //   walletWithBalance.balance = { ... };
      // }

      return success(walletWithBalance);
    } catch (error) {
      return failure(
        new WalletError(
          'Failed to get wallet',
          WalletErrorCodes.WALLET_NOT_FOUND,
          error
        )
      );
    }
  }

  /**
   * Updates wallet metadata (label, active status)
   * @param walletId - Wallet identifier
   * @param updates - Fields to update
   */
  async updateWallet(
    walletId: string,
    updates: { label?: string; isActive?: boolean }
  ): Promise<Result<WalletInfo, WalletError>> {
    try {
      const wallet = await this.keyProvider.getWallet(walletId);

      if (!wallet) {
        return failure(
          new WalletError(
            `Wallet not found: ${walletId}`,
            WalletErrorCodes.WALLET_NOT_FOUND
          )
        );
      }

      const store = getStore();
      await store.updateWallet(walletId, updates);

      const updatedWallet = await this.keyProvider.getWallet(walletId);
      return success(updatedWallet!);
    } catch (error) {
      return failure(
        new WalletError(
          'Failed to update wallet',
          WalletErrorCodes.WALLET_NOT_FOUND,
          error
        )
      );
    }
  }

  /**
   * Deletes a wallet
   * @param walletId - Wallet identifier
   */
  async deleteWallet(walletId: string): Promise<Result<void, WalletError>> {
    try {
      const wallet = await this.keyProvider.getWallet(walletId);

      if (!wallet) {
        return failure(
          new WalletError(
            `Wallet not found: ${walletId}`,
            WalletErrorCodes.WALLET_NOT_FOUND
          )
        );
      }

      await this.keyProvider.deleteWallet(walletId);

      const store = getStore();
      await store.addAuditLog({
        action: 'wallet_deleted',
        walletId,
        chain: wallet.chain,
      });

      return success(undefined);
    } catch (error) {
      return failure(
        new WalletError(
          'Failed to delete wallet',
          WalletErrorCodes.WALLET_NOT_FOUND,
          error
        )
      );
    }
  }

  /**
   * Validates an address for a specific chain
   * @param chain - Target chain
   * @param address - Address to validate
   * @returns true if valid
   */
  validateAddress(chain: Chain, address: string): boolean {
    const chainService = getChainService(chain);
    return chainService.validateAddress(address);
  }

  /**
   * Gets the key provider type
   */
  getProviderType(): string {
    return this.keyProvider.type;
  }

  /**
   * Checks if the provider has local keys
   */
  hasLocalKeys(): boolean {
    return this.keyProvider.hasLocalKeys;
  }
}
