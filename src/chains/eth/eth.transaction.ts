/**
 * Ethereum transaction building and signing
 */

import { ethers, Transaction } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import type {
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
} from '@/types';
import { ethToWei, estimateTransferGas } from './eth.utils';

/** Ethereum mainnet chain ID */
const ETH_CHAIN_ID = 1;

/**
 * Builds an unsigned Ethereum transaction
 * @param params - Transaction parameters
 * @param prerequisites - Nonce and gas price info
 * @returns Unsigned transaction
 */
export function buildTransaction(
  params: BuildTransactionParams,
  prerequisites: TransactionPrerequisites
): UnsignedTransaction {
  const { from, to, amount, memo, gasLimit, gasPrice } = params;
  const { nonce = 0 } = prerequisites;

  // Convert amount to wei
  const amountWei = ethToWei(amount);

  // Use provided gas limit or estimate for simple transfer
  const gasLimitValue = gasLimit || estimateTransferGas().toString();

  // Default gas price if not provided (20 gwei)
  const gasPriceValue = gasPrice || ethers.parseUnits('20', 'gwei').toString();

  // Calculate fee
  const fee = (BigInt(gasLimitValue) * BigInt(gasPriceValue)).toString();

  return {
    id: uuidv4(),
    chain: 'ETH',
    from,
    to,
    amount: amountWei,
    fee,
    memo,
    createdAt: Date.now(),
    nonce,
    gasLimit: gasLimitValue,
    gasPrice: gasPriceValue,
    chainId: ETH_CHAIN_ID,
    data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : '0x',
  };
}

/**
 * Builds an EIP-1559 unsigned transaction
 * @param params - Transaction parameters
 * @param prerequisites - Nonce and fee info
 * @param maxFeePerGas - Maximum fee per gas
 * @param maxPriorityFeePerGas - Maximum priority fee per gas
 * @returns Unsigned transaction
 */
export function buildEip1559Transaction(
  params: BuildTransactionParams,
  prerequisites: TransactionPrerequisites,
  maxFeePerGas: string,
  maxPriorityFeePerGas: string
): UnsignedTransaction {
  const { from, to, amount, memo, gasLimit } = params;
  const { nonce = 0 } = prerequisites;

  const amountWei = ethToWei(amount);
  const gasLimitValue = gasLimit || estimateTransferGas().toString();
  const fee = (BigInt(gasLimitValue) * BigInt(maxFeePerGas)).toString();

  return {
    id: uuidv4(),
    chain: 'ETH',
    from,
    to,
    amount: amountWei,
    fee,
    memo,
    createdAt: Date.now(),
    nonce,
    gasLimit: gasLimitValue,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId: ETH_CHAIN_ID,
    data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : '0x',
  };
}

/**
 * Signs an Ethereum transaction
 * @param unsignedTx - Transaction to sign
 * @param privateKeyHex - Private key in hex format
 * @returns Signed transaction
 */
export function signTransaction(
  unsignedTx: UnsignedTransaction,
  privateKeyHex: string
): SignedTransaction {
  const wallet = new ethers.Wallet(privateKeyHex);

  // Build transaction object
  const txRequest: ethers.TransactionLike = {
    to: unsignedTx.to,
    value: BigInt(unsignedTx.amount),
    nonce: unsignedTx.nonce,
    chainId: unsignedTx.chainId || ETH_CHAIN_ID,
    data: unsignedTx.data || '0x',
  };

  // Use EIP-1559 or legacy gas pricing
  if (unsignedTx.maxFeePerGas && unsignedTx.maxPriorityFeePerGas) {
    txRequest.maxFeePerGas = BigInt(unsignedTx.maxFeePerGas);
    txRequest.maxPriorityFeePerGas = BigInt(unsignedTx.maxPriorityFeePerGas);
    txRequest.gasLimit = BigInt(unsignedTx.gasLimit || '21000');
    txRequest.type = 2;
  } else {
    txRequest.gasPrice = BigInt(unsignedTx.gasPrice || '0');
    txRequest.gasLimit = BigInt(unsignedTx.gasLimit || '21000');
    txRequest.type = 0;
  }

  // Create and sign transaction
  const tx = Transaction.from(txRequest);
  const signedTx = tx.clone();
  signedTx.signature = wallet.signingKey.sign(tx.unsignedHash);

  // Ensure serialized is a hex string and compute tx hash deterministically
  const serializedBytes = signedTx.serialized;
  const serializedHex = ethers.hexlify(serializedBytes);
  const txHash = ethers.keccak256(serializedHex);

  return {
    unsignedTxId: unsignedTx.id,
    chain: 'ETH',
    unsignedTx,
    signature: signedTx.signature?.serialized || '',
    serialized: serializedHex,
    txHash,
    signedAt: Date.now(),
  };
}

/**
 * Parses a serialized Ethereum transaction
 * @param serialized - Hex-encoded signed transaction
 * @returns Partial transaction details
 */
export function parseTransaction(serialized: string): Partial<UnsignedTransaction> {
  const tx = Transaction.from(serialized);

  return {
    chain: 'ETH',
    from: tx.from || undefined,
    to: tx.to || '',
    amount: tx.value.toString(),
    nonce: tx.nonce,
    gasLimit: tx.gasLimit.toString(),
    gasPrice: tx.gasPrice?.toString(),
    maxFeePerGas: tx.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
    data: tx.data,
    chainId: Number(tx.chainId),
  };
}

/**
 * Estimates gas for a transaction
 * @param data - Transaction data
 * @returns Estimated gas limit
 */
export function estimateGas(data?: string): string {
  // Base gas for transfer
  let gas = BigInt(21000);

  // Add gas for data if present
  if (data && data !== '0x') {
    const dataBytes = ethers.getBytes(data);
    for (const byte of dataBytes) {
      gas += byte === 0 ? BigInt(4) : BigInt(16);
    }
  }

  return gas.toString();
}
