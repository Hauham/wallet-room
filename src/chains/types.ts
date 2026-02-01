/**
 * Chain service interface and types
 * All chain implementations must implement IChainService
 */

import type {
  Chain,
  Balance,
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';

/**
 * Core interface that all chain implementations must implement
 * Provides unified API for wallet and transaction operations across all chains
 */
export interface IChainService {
  /** The chain this service handles */
  readonly chain: Chain;

  // ============ Address Operations ============

  /**
   * Validates if an address is valid for this chain
   * @param address - Address to validate
   * @returns true if address is valid
   */
  validateAddress(address: string): boolean;

  /**
   * Derives address from public key
   * @param publicKey - Public key in hex format
   * @param options - Chain-specific options (e.g., address type for BTC)
   * @returns Derived address
   */
  deriveAddress(publicKey: string, options?: Record<string, unknown>): string;

  // ============ Key Operations ============

  /**
   * Derives public key and address from seed
   * @param seed - BIP39 seed buffer
   * @param derivationPath - HD derivation path
   * @param options - Chain-specific options
   * @returns Object containing publicKey and address
   */
  deriveFromSeed(
    seed: Buffer,
    derivationPath: string,
    options?: Record<string, unknown>
  ): { publicKey: string; address: string; privateKey?: string };

  // ============ Transaction Operations ============

  /**
   * Builds an unsigned transaction
   * @param params - Transaction parameters
   * @param prerequisites - Chain-specific prerequisites (nonce, utxos, etc.)
   * @returns Unsigned transaction ready for signing
   */
  buildTransaction(
    params: BuildTransactionParams,
    prerequisites: TransactionPrerequisites
  ): Promise<UnsignedTransaction>;

  /**
   * Signs an unsigned transaction with private key
   * @param unsignedTx - Transaction to sign
   * @param privateKey - Private key in hex format
   * @returns Signed transaction with serialized format
   */
  signTransaction(
    unsignedTx: UnsignedTransaction,
    privateKey: string
  ): Promise<SignedTransaction>;

  /**
   * Serializes a signed transaction for broadcast
   * @param signedTx - Signed transaction
   * @returns Hex-encoded serialized transaction
   */
  serializeTransaction(signedTx: SignedTransaction): string;

  /**
   * Parses a serialized transaction
   * @param serialized - Serialized transaction hex
   * @returns Parsed transaction details
   */
  parseTransaction(serialized: string): Partial<UnsignedTransaction>;

  // ============ Online Operations (Optional) ============

  /**
   * Broadcasts a signed transaction to the network
   * Only available in online mode
   * @param serializedTx - Serialized transaction hex
   * @returns Transaction hash
   */
  broadcastTransaction?(serializedTx: string): Promise<string>;

  /**
   * Gets balance for an address
   * Only available in online mode
   * @param address - Address to query
   * @returns Balance information
   */
  getBalance?(address: string): Promise<Balance>;

  /**
   * Gets transaction prerequisites for building a transaction
   * Only available in online mode
   * @param address - Sender address
   * @returns Prerequisites like nonce, utxos, sequence
   */
  getTransactionPrerequisites?(address: string): Promise<TransactionPrerequisites>;

  /**
   * Gets current recommended fee
   * Only available in online mode
   * @returns Recommended fee in chain-specific format
   */
  getRecommendedFee?(): Promise<string>;
}

/**
 * Factory function type for creating chain services
 */
export type ChainServiceFactory = () => IChainService;

/**
 * Registry of chain services
 */
export type ChainServiceRegistry = Record<Chain, IChainService>;
