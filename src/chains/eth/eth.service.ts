/**
 * Ethereum chain service implementation
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
import { isValidEthAddress, deriveAddressFromPublicKey } from './eth.utils';
import { deriveFromSeed } from './eth.wallet';
import {
  buildTransaction as buildTx,
  signTransaction as signTx,
  parseTransaction as parseTx,
} from './eth.transaction';

/**
 * Ethereum chain service
 * Implements IChainService for Ethereum operations
 */
export class EthService implements IChainService {
  readonly chain: Chain = 'ETH';

  /**
   * Validates an Ethereum address
   */
  validateAddress(address: string): boolean {
    return isValidEthAddress(address);
  }

  /**
   * Derives address from public key
   * @param publicKey - Uncompressed public key in hex format (65 bytes with 04 prefix)
   * @returns Ethereum checksum address
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
   * Broadcasts transaction to Ethereum network
   */
  async broadcastTransaction(serializedTx: string): Promise<string> {
    throw new Error('Broadcasting not available in offline mode');
  }

  /**
   * Gets balance for an Ethereum address
   */
  async getBalance(address: string): Promise<Balance> {
    throw new Error('Balance query not available in offline mode');
  }

  /**
   * Gets transaction prerequisites (nonce, gas price)
   */
  async getTransactionPrerequisites(
    address: string
  ): Promise<TransactionPrerequisites> {
    throw new Error('Nonce query not available in offline mode');
  }

  /**
   * Gets recommended gas price
   */
  async getRecommendedFee(): Promise<string> {
    throw new Error('Gas price query not available in offline mode');
  }
}
