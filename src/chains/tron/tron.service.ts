/**
 * TRON chain service implementation
 */

import type { IChainService } from '../types';
import type {
  Chain,
  Balance,
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';
import { isValidTronAddress, deriveAddressFromPublicKey } from './tron.utils';
import { deriveFromSeed } from './tron.wallet';
import {
  buildTransaction as buildTx,
  signTransaction as signTx,
  parseTransaction as parseTx,
} from './tron.transaction';

/**
 * TRON chain service
 * Implements IChainService for TRON operations
 */
export class TronService implements IChainService {
  readonly chain: Chain = 'TRON';

  /**
   * Validates a TRON address
   */
  validateAddress(address: string): boolean {
    return isValidTronAddress(address);
  }

  /**
   * Derives address from public key
   */
  deriveAddress(publicKey: string): string {
    return deriveAddressFromPublicKey(publicKey);
  }

  /**
   * Derives wallet from seed
   */
  deriveFromSeed(
    seed: Buffer,
    derivationPath: string
  ): { publicKey: string; address: string; privateKey?: string } {
    return deriveFromSeed(seed, derivationPath);
  }

  /**
   * Builds an unsigned transaction
   */
  async buildTransaction(
    params: BuildTransactionParams,
    prerequisites: TransactionPrerequisites
  ): Promise<UnsignedTransaction> {
    return buildTx(params, prerequisites);
  }

  /**
   * Signs a transaction
   */
  async signTransaction(
    unsignedTx: UnsignedTransaction,
    privateKey: string
  ): Promise<SignedTransaction> {
    return signTx(unsignedTx, privateKey);
  }

  /**
   * Serializes a signed transaction
   */
  serializeTransaction(signedTx: SignedTransaction): string {
    return signedTx.serialized;
  }

  /**
   * Parses a serialized transaction
   */
  parseTransaction(serialized: string): Partial<UnsignedTransaction> {
    return parseTx(serialized);
  }

  // ============ Online Operations ============

  /**
   * Broadcasts transaction to TRON network
   */
  async broadcastTransaction(serializedTx: string): Promise<string> {
    throw new Error('Broadcasting not available in offline mode');
  }

  /**
   * Gets balance for a TRON address
   */
  async getBalance(address: string): Promise<Balance> {
    throw new Error('Balance query not available in offline mode');
  }

  /**
   * Gets transaction prerequisites (block reference)
   */
  async getTransactionPrerequisites(
    address: string
  ): Promise<TransactionPrerequisites> {
    throw new Error('Block reference query not available in offline mode');
  }

  /**
   * Gets recommended fee
   */
  async getRecommendedFee(): Promise<string> {
    throw new Error('Fee query not available in offline mode');
  }
}
