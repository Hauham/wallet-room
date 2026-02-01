/**
 * Transaction-related type definitions
 */

import type { Chain } from './common.types';

/** Bitcoin UTXO (Unspent Transaction Output) */
export interface UTXO {
  txid: string;
  vout: number;
  value: string;
  scriptPubKey: string;
  address: string;
  confirmations: number;
}

/** Unsigned transaction for all chains */
export interface UnsignedTransaction {
  /** Unique identifier for the transaction request */
  id: string;
  /** Target blockchain */
  chain: Chain;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount in smallest unit */
  amount: string;
  /** Fee in smallest unit */
  fee: string;
  /** Optional memo/data field */
  memo?: string;
  /** Creation timestamp */
  createdAt: number;

  // ETH-specific
  /** Transaction nonce */
  nonce?: number;
  /** Gas limit */
  gasLimit?: string;
  /** Gas price in wei */
  gasPrice?: string;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: string;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: string;
  /** Contract data */
  data?: string;
  /** Chain ID */
  chainId?: number;

  // BTC-specific
  /** UTXOs to spend */
  utxos?: UTXO[];
  /** Change address */
  changeAddress?: string;
  /** Fee rate in sat/vB */
  feeRate?: number;

  // XRP-specific
  /** Account sequence number */
  sequence?: number;
  /** Destination tag */
  destinationTag?: number;
  /** Last ledger sequence */
  lastLedgerSequence?: number;

  // TRON-specific
  /** Transaction expiration timestamp */
  expiration?: number;
  /** Reference block bytes */
  refBlockBytes?: string;
  /** Reference block hash */
  refBlockHash?: string;
}

/** Signed transaction ready for broadcast */
export interface SignedTransaction {
  /** Reference to unsigned transaction ID */
  unsignedTxId: string;
  /** Target blockchain */
  chain: Chain;
  /** Original unsigned transaction */
  unsignedTx: UnsignedTransaction;
  /** Signature(s) */
  signature: string | string[];
  /** Serialized transaction ready for broadcast */
  serialized: string;
  /** Transaction hash/ID */
  txHash: string;
  /** Signing timestamp */
  signedAt: number;
}

/** Transaction status */
export type TransactionStatus =
  | 'pending'
  | 'signed'
  | 'broadcast'
  | 'confirmed'
  | 'failed';

/** Transaction record for history */
export interface TransactionRecord {
  id: string;
  chain: Chain;
  walletId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  fee: string;
  status: TransactionStatus;
  createdAt: number;
  signedAt?: number;
  broadcastAt?: number;
  confirmedAt?: number;
  confirmations?: number;
  blockNumber?: number;
  memo?: string;
}

/** Parameters for building a transaction */
export interface BuildTransactionParams {
  chain: Chain;
  from: string;
  to: string;
  /** Amount in human-readable format */
  amount: string;
  memo?: string;
  /** BTC-specific */
  feeRate?: number;
  /** ETH-specific */
  gasLimit?: string;
  gasPrice?: string;
  /** XRP-specific */
  destinationTag?: number;
}

/** Chain-specific transaction prerequisites */
export interface TransactionPrerequisites {
  chain: Chain;
  address: string;
  /** ETH: current nonce */
  nonce?: number;
  /** BTC: available UTXOs */
  utxos?: UTXO[];
  /** XRP: current sequence */
  sequence?: number;
  /** TRON: reference block info */
  refBlockBytes?: string;
  refBlockHash?: string;
  /** Suggested fee */
  suggestedFee?: string;
  /** Account balance */
  balance?: string;
}

/** Balance information */
export interface Balance {
  /** Balance in smallest unit */
  confirmed: string;
  /** Unconfirmed/pending balance */
  unconfirmed?: string;
  /** Total balance */
  total: string;
}
