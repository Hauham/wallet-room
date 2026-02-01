/**
 * Transaction Service
 * Handles transaction building, signing, and management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Chain,
  UnsignedTransaction,
  SignedTransaction,
  TransactionRecord,
  BuildTransactionParams,
  TransactionPrerequisites,
  Result,
} from '@/types';
import { success, failure } from '@/types';
import type { IKeyProvider } from '@/providers';
import { getChainService } from '@/chains';
import { getStore } from '@/storage';

/**
 * Transaction operation error
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

/** Error codes */
export const TransactionErrorCodes = {
  PROVIDER_LOCKED: 'PROVIDER_LOCKED',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BUILD_FAILED: 'BUILD_FAILED',
  SIGN_FAILED: 'SIGN_FAILED',
  BROADCAST_FAILED: 'BROADCAST_FAILED',
  OFFLINE_MODE: 'OFFLINE_MODE',
} as const;

/**
 * Transaction Service
 * Manages transaction lifecycle
 */
export class TransactionService {
  private keyProvider: IKeyProvider;
  private isOnline: boolean;

  constructor(keyProvider: IKeyProvider, isOnline: boolean = false) {
    this.keyProvider = keyProvider;
    this.isOnline = isOnline;
  }

  /**
   * Builds an unsigned transaction
   * @param params - Transaction parameters
   * @param prerequisites - Chain-specific prerequisites
   * @returns Unsigned transaction
   */
  async buildTransaction(
    params: BuildTransactionParams,
    prerequisites: TransactionPrerequisites
  ): Promise<Result<UnsignedTransaction, TransactionError>> {
    try {
      // Validate addresses
      const chainService = getChainService(params.chain);

      if (!chainService.validateAddress(params.from)) {
        return failure(
          new TransactionError(
            'Invalid sender address',
            TransactionErrorCodes.INVALID_ADDRESS,
            { field: 'from', address: params.from }
          )
        );
      }

      if (!chainService.validateAddress(params.to)) {
        return failure(
          new TransactionError(
            'Invalid recipient address',
            TransactionErrorCodes.INVALID_ADDRESS,
            { field: 'to', address: params.to }
          )
        );
      }

      // Validate amount
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount <= 0) {
        return failure(
          new TransactionError(
            'Invalid amount',
            TransactionErrorCodes.INVALID_AMOUNT,
            { amount: params.amount }
          )
        );
      }

      // Build transaction
      const unsignedTx = await chainService.buildTransaction(params, prerequisites);

      // Log transaction creation
      const store = getStore();
      await store.addAuditLog({
        action: 'transaction_built',
        chain: params.chain,
        details: `From: ${params.from}, To: ${params.to}, Amount: ${params.amount}`,
      });

      return success(unsignedTx);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('insufficient') || message.includes('balance')) {
        return failure(
          new TransactionError(
            message,
            TransactionErrorCodes.INSUFFICIENT_BALANCE,
            error
          )
        );
      }

      return failure(
        new TransactionError(
          'Failed to build transaction',
          TransactionErrorCodes.BUILD_FAILED,
          error
        )
      );
    }
  }

  /**
   * Signs an unsigned transaction
   * @param walletId - Wallet to sign with
   * @param unsignedTx - Transaction to sign
   * @returns Signed transaction
   */
  async signTransaction(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<Result<SignedTransaction, TransactionError>> {
    try {
      if (!(await this.keyProvider.isUnlocked())) {
        return failure(
          new TransactionError(
            'Key provider is locked',
            TransactionErrorCodes.PROVIDER_LOCKED
          )
        );
      }

      const wallet = await this.keyProvider.getWallet(walletId);
      if (!wallet) {
        return failure(
          new TransactionError(
            `Wallet not found: ${walletId}`,
            TransactionErrorCodes.WALLET_NOT_FOUND
          )
        );
      }

      // Sign transaction
      const signedTx = await this.keyProvider.signTransaction(walletId, unsignedTx);

      // Save transaction record
      const txRecord: TransactionRecord = {
        id: uuidv4(),
        chain: unsignedTx.chain,
        walletId,
        txHash: signedTx.txHash,
        from: unsignedTx.from,
        to: unsignedTx.to,
        amount: unsignedTx.amount,
        fee: unsignedTx.fee,
        status: 'signed',
        createdAt: unsignedTx.createdAt,
        signedAt: signedTx.signedAt,
        memo: unsignedTx.memo,
      };

      const store = getStore();
      await store.saveTransaction(txRecord);

      await store.addAuditLog({
        action: 'transaction_signed',
        walletId,
        chain: unsignedTx.chain,
        details: `TxHash: ${signedTx.txHash}`,
      });

      return success(signedTx);
    } catch (error) {
      return failure(
        new TransactionError(
          'Failed to sign transaction',
          TransactionErrorCodes.SIGN_FAILED,
          error
        )
      );
    }
  }

  /**
   * Broadcasts a signed transaction (online mode only)
   * @param signedTx - Signed transaction
   * @returns Transaction hash
   */
  async broadcastTransaction(
    signedTx: SignedTransaction
  ): Promise<Result<string, TransactionError>> {
    if (!this.isOnline) {
      return failure(
        new TransactionError(
          'Broadcasting not available in offline mode',
          TransactionErrorCodes.OFFLINE_MODE
        )
      );
    }

    try {
      const chainService = getChainService(signedTx.chain);

      if (!chainService.broadcastTransaction) {
        return failure(
          new TransactionError(
            'Broadcasting not supported for this chain',
            TransactionErrorCodes.BROADCAST_FAILED
          )
        );
      }

      const txHash = await chainService.broadcastTransaction(signedTx.serialized);

      // Update transaction record
      const store = getStore();
      await store.updateTransaction(signedTx.unsignedTxId, {
        status: 'broadcast',
        broadcastAt: Date.now(),
      });

      await store.addAuditLog({
        action: 'transaction_broadcast',
        chain: signedTx.chain,
        details: `TxHash: ${txHash}`,
      });

      return success(txHash);
    } catch (error) {
      return failure(
        new TransactionError(
          'Failed to broadcast transaction',
          TransactionErrorCodes.BROADCAST_FAILED,
          error
        )
      );
    }
  }

  /**
   * Gets transaction history for a wallet
   * @param walletId - Optional wallet filter
   * @returns List of transaction records
   */
  async getTransactionHistory(walletId?: string): Promise<TransactionRecord[]> {
    const store = getStore();
    return store.getTransactions(walletId);
  }

  /**
   * Gets transaction prerequisites (online mode only)
   * @param chain - Target chain
   * @param address - Sender address
   * @returns Prerequisites for building transaction
   */
  async getTransactionPrerequisites(
    chain: Chain,
    address: string
  ): Promise<Result<TransactionPrerequisites, TransactionError>> {
    if (!this.isOnline) {
      // Return minimal prerequisites for offline mode
      return success({
        chain,
        address,
      });
    }

    try {
      const chainService = getChainService(chain);

      if (!chainService.getTransactionPrerequisites) {
        return success({
          chain,
          address,
        });
      }

      const prerequisites = await chainService.getTransactionPrerequisites(address);
      return success(prerequisites);
    } catch (error) {
      return failure(
        new TransactionError(
          'Failed to get transaction prerequisites',
          TransactionErrorCodes.BUILD_FAILED,
          error
        )
      );
    }
  }

  /**
   * Parses a serialized transaction
   * @param chain - Target chain
   * @param serialized - Serialized transaction data
   * @returns Parsed transaction details
   */
  parseTransaction(
    chain: Chain,
    serialized: string
  ): Partial<UnsignedTransaction> {
    const chainService = getChainService(chain);
    return chainService.parseTransaction(serialized);
  }

  /**
   * Estimates transaction fee
   * @param chain - Target chain
   * @param params - Transaction parameters
   * @returns Estimated fee
   */
  async estimateFee(
    chain: Chain,
    params: Partial<BuildTransactionParams>
  ): Promise<Result<string, TransactionError>> {
    if (!this.isOnline) {
      // Return default fee estimates for offline mode
      const defaultFees: Record<Chain, string> = {
        BTC: '1000', // 1000 satoshi
        ETH: '21000000000000', // 21000 * 1 gwei in wei
        XRP: '12', // 12 drops
        TRON: '100000', // 0.1 TRX in SUN
      };

      return success(defaultFees[chain] || '0');
    }

    try {
      const chainService = getChainService(chain);

      if (!chainService.getRecommendedFee) {
        return success('0');
      }

      const fee = await chainService.getRecommendedFee();
      return success(fee);
    } catch (error) {
      return failure(
        new TransactionError(
          'Failed to estimate fee',
          TransactionErrorCodes.BUILD_FAILED,
          error
        )
      );
    }
  }
}
