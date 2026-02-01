/**
 * XRP Ledger chain service implementation
 */

import { deriveAddress as xrplDeriveAddress } from 'xrpl';
import type { IChainService } from '../types';
import type {
  Chain,
  Balance,
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';
import { isValidXrpAddress } from './xrp.utils';
import { deriveFromSeed } from './xrp.wallet';
import {
  buildTransaction as buildTx,
  signTransaction as signTx,
  parseTransaction as parseTx,
} from './xrp.transaction';

/**
 * XRP Ledger chain service
 * Implements IChainService for XRP operations
 */
export class XrpService implements IChainService {
  readonly chain: Chain = 'XRP';

  /**
   * Validates an XRP address
   */
  validateAddress(address: string): boolean {
    return isValidXrpAddress(address);
  }

  /**
   * Derives address from public key
   */
  deriveAddress(publicKey: string): string {
    return xrplDeriveAddress(publicKey);
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
   * Broadcasts transaction to XRP Ledger
   */
  async broadcastTransaction(serializedTx: string): Promise<string> {
    throw new Error('Broadcasting not available in offline mode');
  }

  /**
   * Gets balance for an XRP address
   */
  async getBalance(address: string): Promise<Balance> {
    throw new Error('Balance query not available in offline mode');
  }

  /**
   * Gets transaction prerequisites (sequence number)
   */
  async getTransactionPrerequisites(
    address: string
  ): Promise<TransactionPrerequisites> {
    throw new Error('Sequence query not available in offline mode');
  }

  /**
   * Gets recommended fee
   */
  async getRecommendedFee(): Promise<string> {
    throw new Error('Fee query not available in offline mode');
  }
}
