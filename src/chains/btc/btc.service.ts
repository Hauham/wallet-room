/**
 * Bitcoin chain service implementation
 */

import type { IChainService } from '../types';
import type {
  Chain,
  Balance,
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
  BtcAddressType,
} from '@/types';
import { isValidBtcAddress, deriveAddress as deriveAddressUtil } from './btc.utils';
import { deriveFromSeed } from './btc.wallet';
import {
  buildTransaction as buildTx,
  signTransaction as signTx,
  parseTransaction as parseTx,
} from './btc.transaction';

/**
 * Bitcoin chain service
 * Implements IChainService for Bitcoin operations
 */
export class BtcService implements IChainService {
  readonly chain: Chain = 'BTC';

  /**
   * Validates a Bitcoin address
   */
  validateAddress(address: string): boolean {
    return isValidBtcAddress(address);
  }

  /**
   * Derives address from public key
   */
  deriveAddress(
    publicKey: string,
    options?: Record<string, unknown>
  ): string {
    const addressType = (options?.addressType as BtcAddressType) || 'native-segwit';
    return deriveAddressUtil(publicKey, addressType);
  }

  /**
   * Derives wallet from seed
   */
  deriveFromSeed(
    seed: Buffer,
    derivationPath: string,
    options?: Record<string, unknown>
  ): { publicKey: string; address: string; privateKey?: string } {
    const addressType = (options?.addressType as BtcAddressType) || 'native-segwit';
    return deriveFromSeed(seed, derivationPath, addressType);
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
  // These would be implemented when in online mode with network access

  /**
   * Broadcasts transaction to Bitcoin network
   * @param serializedTx - Hex-encoded signed transaction
   * @returns Transaction hash
   */
  async broadcastTransaction(serializedTx: string): Promise<string> {
    // This would use a Bitcoin node or API service
    // For now, throw as we're focusing on offline functionality
    throw new Error('Broadcasting not available in offline mode');
  }

  /**
   * Gets balance for a Bitcoin address
   * @param address - Bitcoin address
   * @returns Balance information
   */
  async getBalance(address: string): Promise<Balance> {
    // This would query a Bitcoin node or API
    throw new Error('Balance query not available in offline mode');
  }

  /**
   * Gets transaction prerequisites (UTXOs)
   * @param address - Sender address
   * @returns UTXOs and other prerequisites
   */
  async getTransactionPrerequisites(
    address: string
  ): Promise<TransactionPrerequisites> {
    // This would fetch UTXOs from a node or API
    throw new Error('UTXO query not available in offline mode');
  }

  /**
   * Gets recommended fee rate
   * @returns Fee rate in sat/vB
   */
  async getRecommendedFee(): Promise<string> {
    // This would query current network fee rates
    throw new Error('Fee estimation not available in offline mode');
  }
}
