/**
 * XRP Ledger transaction building and signing
 */

import { encode, decode } from 'xrpl';
import { sign } from 'xrpl/dist/npm/Wallet/signer';
import { deriveKeypair } from 'xrpl';
import { v4 as uuidv4 } from 'uuid';
import type {
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';
import { xrpToDrops, STANDARD_FEE_DROPS } from './xrp.utils';

/**
 * Builds an unsigned XRP payment transaction
 * @param params - Transaction parameters
 * @param prerequisites - Sequence and other prerequisites
 * @returns Unsigned transaction
 */
export function buildTransaction(
  params: BuildTransactionParams,
  prerequisites: TransactionPrerequisites
): UnsignedTransaction {
  const { from, to, amount, memo } = params;
  const { sequence = 0 } = prerequisites;

  // Convert amount to drops
  const amountDrops = xrpToDrops(amount);

  // Calculate last ledger sequence (current + buffer)
  const lastLedgerSequence = (prerequisites.sequence || 0) + 20;

  return {
    id: uuidv4(),
    chain: 'XRP',
    from,
    to,
    amount: amountDrops,
    fee: STANDARD_FEE_DROPS,
    memo,
    createdAt: Date.now(),
    sequence,
    lastLedgerSequence,
    destinationTag: params.destinationTag,
  };
}

/**
 * Signs an XRP transaction
 * @param unsignedTx - Transaction to sign
 * @param privateKeyHex - Private key in hex format
 * @returns Signed transaction
 */
export function signTransaction(
  unsignedTx: UnsignedTransaction,
  privateKeyHex: string
): SignedTransaction {
  // Build XRP transaction object
  const txJson: Record<string, unknown> = {
    TransactionType: 'Payment',
    Account: unsignedTx.from,
    Destination: unsignedTx.to,
    Amount: unsignedTx.amount,
    Fee: unsignedTx.fee,
    Sequence: unsignedTx.sequence,
    LastLedgerSequence: unsignedTx.lastLedgerSequence,
  };

  // Add destination tag if present
  if (unsignedTx.destinationTag !== undefined) {
    txJson['DestinationTag'] = unsignedTx.destinationTag;
  }

  // Add memo if present
  if (unsignedTx.memo) {
    txJson['Memos'] = [
      {
        Memo: {
          MemoData: Buffer.from(unsignedTx.memo, 'utf8').toString('hex').toUpperCase(),
        },
      },
    ];
  }

  // Derive keypair from private key
  const keypair = deriveKeypair('00' + privateKeyHex);

  // Sign the transaction
  const signedResult = sign(JSON.stringify(txJson), keypair);

  // Parse the signed blob to get the hash
  const decoded = decode(signedResult.tx_blob);

  return {
    unsignedTxId: unsignedTx.id,
    chain: 'XRP',
    unsignedTx,
    signature: signedResult.tx_blob,
    serialized: signedResult.tx_blob,
    txHash: signedResult.hash,
    signedAt: Date.now(),
  };
}

/**
 * Parses a serialized XRP transaction
 * @param serialized - Serialized transaction blob
 * @returns Partial transaction details
 */
export function parseTransaction(serialized: string): Partial<UnsignedTransaction> {
  const decoded = decode(serialized) as Record<string, unknown>;

  return {
    chain: 'XRP',
    from: decoded['Account'] as string,
    to: decoded['Destination'] as string,
    amount: decoded['Amount'] as string,
    fee: decoded['Fee'] as string,
    sequence: decoded['Sequence'] as number,
    destinationTag: decoded['DestinationTag'] as number | undefined,
  };
}

/**
 * Calculates the transaction hash from a signed blob
 * @param signedBlob - Signed transaction blob
 * @returns Transaction hash
 */
export function getTransactionHash(signedBlob: string): string {
  // The hash is calculated from the signed transaction blob
  // This is a simplified version - actual implementation would use proper hashing
  const crypto = require('crypto');
  const binaryData = Buffer.from(signedBlob, 'hex');
  const prefix = Buffer.from([0x54, 0x58, 0x4e, 0x00]); // "TXN" prefix
  const combined = Buffer.concat([prefix, binaryData]);
  return crypto.createHash('sha512').update(combined).digest('hex').substring(0, 64).toUpperCase();
}
