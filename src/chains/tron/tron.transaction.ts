/**
 * TRON transaction building and signing
 */

import { sha256 } from '@noble/hashes/sha256';
import * as ecc from '@bitcoinerlab/secp256k1';
import { v4 as uuidv4 } from 'uuid';
import type {
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';
import { trxToSun, base58ToHexAddress, BANDWIDTH_FEE_SUN } from './tron.utils';

/**
 * Builds an unsigned TRON transaction
 * @param params - Transaction parameters
 * @param prerequisites - Block reference and other prerequisites
 * @returns Unsigned transaction
 */
export function buildTransaction(
  params: BuildTransactionParams,
  prerequisites: TransactionPrerequisites
): UnsignedTransaction {
  const { from, to, amount, memo } = params;
  const { refBlockBytes, refBlockHash } = prerequisites;

  // Convert amount to SUN
  const amountSun = trxToSun(amount);

  // Set expiration (current time + 10 minutes)
  const expiration = Date.now() + 10 * 60 * 1000;

  return {
    id: uuidv4(),
    chain: 'TRON',
    from,
    to,
    amount: amountSun,
    fee: BANDWIDTH_FEE_SUN,
    memo,
    createdAt: Date.now(),
    expiration,
    refBlockBytes: refBlockBytes || '0000',
    refBlockHash: refBlockHash || '0000000000000000',
  };
}

/**
 * Creates the raw transaction data for signing
 * @param unsignedTx - Unsigned transaction
 * @returns Raw transaction bytes
 */
function createRawTransaction(unsignedTx: UnsignedTransaction): Buffer {
  // Convert addresses to hex
  const ownerAddressHex = base58ToHexAddress(unsignedTx.from);
  const toAddressHex = base58ToHexAddress(unsignedTx.to);

  // Build transaction in protobuf format (simplified)
  // In production, use proper protobuf serialization
  const txData = {
    raw_data: {
      contract: [
        {
          parameter: {
            value: {
              amount: BigInt(unsignedTx.amount),
              owner_address: ownerAddressHex,
              to_address: toAddressHex,
            },
            type_url: 'type.googleapis.com/protocol.TransferContract',
          },
          type: 'TransferContract',
        },
      ],
      ref_block_bytes: unsignedTx.refBlockBytes,
      ref_block_hash: unsignedTx.refBlockHash,
      expiration: unsignedTx.expiration,
      timestamp: unsignedTx.createdAt,
    },
  };

  // For simplified signing, hash the JSON representation
  // In production, use proper protobuf serialization
  const jsonStr = JSON.stringify(txData);
  return Buffer.from(jsonStr, 'utf8');
}

/**
 * Signs a TRON transaction
 * @param unsignedTx - Transaction to sign
 * @param privateKeyHex - Private key in hex format
 * @returns Signed transaction
 */
export function signTransaction(
  unsignedTx: UnsignedTransaction,
  privateKeyHex: string
): SignedTransaction {
  const privateKey = Buffer.from(privateKeyHex, 'hex');

  // Create raw transaction data
  const rawTxData = createRawTransaction(unsignedTx);

  // Hash the transaction data
  const txHash = sha256(rawTxData);

  // Sign with secp256k1
  const signature = ecc.sign(txHash, privateKey);

  // Get recovery ID
  const publicKey = ecc.pointFromScalar(privateKey, true)!;
  let recoveryId = 0;
  for (let i = 0; i < 4; i++) {
    try {
      const recovered = ecc.recoverPublicKey(txHash, signature, i, true);
      if (recovered && Buffer.from(recovered).equals(Buffer.from(publicKey))) {
        recoveryId = i;
        break;
      }
    } catch {
      continue;
    }
  }

  // Combine signature with recovery ID
  const signatureWithRecovery = Buffer.concat([
    Buffer.from(signature),
    Buffer.from([recoveryId + 27]),
  ]);

  const signatureHex = signatureWithRecovery.toString('hex');
  const txHashHex = Buffer.from(txHash).toString('hex');

  // Create serialized transaction
  const serialized = JSON.stringify({
    raw_data: {
      from: unsignedTx.from,
      to: unsignedTx.to,
      amount: unsignedTx.amount,
      ref_block_bytes: unsignedTx.refBlockBytes,
      ref_block_hash: unsignedTx.refBlockHash,
      expiration: unsignedTx.expiration,
      timestamp: unsignedTx.createdAt,
    },
    signature: [signatureHex],
    txID: txHashHex,
  });

  return {
    unsignedTxId: unsignedTx.id,
    chain: 'TRON',
    unsignedTx,
    signature: signatureHex,
    serialized,
    txHash: txHashHex,
    signedAt: Date.now(),
  };
}

/**
 * Parses a serialized TRON transaction
 * @param serialized - JSON-encoded signed transaction
 * @returns Partial transaction details
 */
export function parseTransaction(serialized: string): Partial<UnsignedTransaction> {
  try {
    const tx = JSON.parse(serialized);
    const rawData = tx.raw_data || {};

    return {
      chain: 'TRON',
      from: rawData.from,
      to: rawData.to,
      amount: rawData.amount,
      expiration: rawData.expiration,
      refBlockBytes: rawData.ref_block_bytes,
      refBlockHash: rawData.ref_block_hash,
    };
  } catch {
    return { chain: 'TRON' };
  }
}
