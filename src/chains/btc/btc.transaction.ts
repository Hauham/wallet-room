/**
 * Bitcoin transaction building and signing
 */

import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { v4 as uuidv4 } from 'uuid';
import type {
  UnsignedTransaction,
  SignedTransaction,
  BuildTransactionParams,
  TransactionPrerequisites,
  BtcAddressType,
} from '@/types';
import {
  getNetwork,
  getAddressType,
  estimateTxSize,
  btcToSatoshi,
} from './btc.utils';
import { getPayment } from './btc.wallet';

// Initialize ECC library
initEccLib(ecc);

/**
 * Builds an unsigned Bitcoin transaction
 * @param params - Transaction parameters
 * @param prerequisites - UTXOs and other prerequisites
 * @returns Unsigned transaction
 */
export function buildTransaction(
  params: BuildTransactionParams,
  prerequisites: TransactionPrerequisites
): UnsignedTransaction {
  const { from, to, amount, memo, feeRate = 10 } = params;
  const { utxos = [] } = prerequisites;

  if (utxos.length === 0) {
    throw new Error('No UTXOs available for spending');
  }

  // Convert amount to satoshis
  const amountSats = BigInt(btcToSatoshi(amount));

  // Calculate total available
  const totalAvailable = utxos.reduce(
    (sum, utxo) => sum + BigInt(utxo.value),
    BigInt(0)
  );

  // Estimate fee
  const addressType = getAddressType(from) || 'native-segwit';
  const estimatedSize = estimateTxSize(utxos.length, 2, addressType); // 2 outputs (recipient + change)
  const estimatedFee = BigInt(estimatedSize * feeRate);

  // Check sufficient balance
  if (totalAvailable < amountSats + estimatedFee) {
    throw new Error(
      `Insufficient balance. Available: ${totalAvailable}, Required: ${amountSats + estimatedFee}`
    );
  }

  return {
    id: uuidv4(),
    chain: 'BTC',
    from,
    to,
    amount: amountSats.toString(),
    fee: estimatedFee.toString(),
    memo,
    createdAt: Date.now(),
    utxos,
    changeAddress: from, // Send change back to sender
    feeRate,
  };
}

/**
 * Signs a Bitcoin transaction
 * @param unsignedTx - Transaction to sign
 * @param privateKeyHex - Private key in hex format
 * @returns Signed transaction
 */
export function signTransaction(
  unsignedTx: UnsignedTransaction,
  privateKeyHex: string
): SignedTransaction {
  const network = getNetwork();
  const psbt = new bitcoin.Psbt({ network });

  const privateKey = Buffer.from(privateKeyHex, 'hex');
  const keyPair = {
    publicKey: Buffer.from(ecc.pointFromScalar(privateKey, true)!),
    privateKey,
  };

  const { utxos = [], to, amount, fee, changeAddress, from } = unsignedTx;

  if (!utxos || utxos.length === 0) {
    throw new Error('No UTXOs in unsigned transaction');
  }

  const addressType = getAddressType(from) || 'native-segwit';
  const payment = getPayment(keyPair.publicKey, addressType);

  // Add inputs
  for (const utxo of utxos) {
    // Convert txid hex string to Buffer (reversed for little-endian)
    const txidBuffer = Buffer.from(utxo.txid, 'hex').reverse();

    const inputData: bitcoin.PsbtTxInput = {
      hash: txidBuffer,
      index: utxo.vout,
    };

    // Add witness/redeem script based on address type
    if (addressType === 'legacy') {
      // P2PKH requires non-witness UTXO (full previous tx)
      // For simplicity, we skip nonWitnessUtxo - caller should provide it
    } else if (addressType === 'segwit') {
      // P2SH-P2WPKH
      psbt.addInput({
        ...inputData,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: Number(utxo.value),
        },
        redeemScript: payment.redeem?.output,
      });
      continue;
    } else if (addressType === 'native-segwit') {
      // P2WPKH
      psbt.addInput({
        ...inputData,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: Number(utxo.value),
        },
      });
      continue;
    } else if (addressType === 'taproot') {
      // P2TR
      psbt.addInput({
        ...inputData,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: Number(utxo.value),
        },
        tapInternalKey: keyPair.publicKey.slice(1), // x-only pubkey
      });
      continue;
    }

    psbt.addInput(inputData);
  }

  // Add recipient output
  psbt.addOutput({
    address: to,
    value: Number(amount),
  });

  // Add change output if there's change
  const totalInput = utxos.reduce((sum, utxo) => sum + Number(utxo.value), 0);
  const changeValue = totalInput - Number(amount) - Number(fee);

  if (changeValue > 546) {
    // Dust threshold
    psbt.addOutput({
      address: changeAddress || from,
      value: changeValue,
    });
  }

  // Create signer object
  const signer: bitcoin.Signer = {
    publicKey: keyPair.publicKey,
    sign: (hash: Buffer) => {
      return Buffer.from(ecc.sign(hash, privateKey));
    },
  };

  // Sign all inputs
  for (let i = 0; i < utxos.length; i++) {
    if (addressType === 'taproot') {
      // For taproot, use signSchnorr
      const taprootSigner = {
        publicKey: keyPair.publicKey,
        sign: signer.sign,
        signSchnorr: (hash: Buffer) => {
          return Buffer.from(ecc.signSchnorr(hash, privateKey));
        },
      };
      psbt.signInput(i, taprootSigner);
    } else {
      psbt.signInput(i, signer);
    }
  }

  // Finalize and extract
  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();

  const serialized = tx.toHex();
  const txHash = tx.getId();

  // Get signature from first input for reference
  const signature = tx.ins[0].script.toString('hex') ||
    (tx.ins[0].witness?.[0]?.toString('hex') ?? '');

  return {
    unsignedTxId: unsignedTx.id,
    chain: 'BTC',
    unsignedTx,
    signature,
    serialized,
    txHash,
    signedAt: Date.now(),
  };
}

/**
 * Parses a serialized Bitcoin transaction
 * @param serialized - Hex-encoded transaction
 * @returns Partial transaction details
 */
export function parseTransaction(serialized: string): Partial<UnsignedTransaction> {
  const tx = bitcoin.Transaction.fromHex(serialized);
  const network = getNetwork();

  // Extract outputs
  const outputs = tx.outs.map((out) => {
    try {
      const address = bitcoin.address.fromOutputScript(out.script, network);
      return { address, value: out.value.toString() };
    } catch {
      return { address: 'unknown', value: out.value.toString() };
    }
  });

  // First output is typically the recipient
  const to = outputs[0]?.address || '';
  const amount = outputs[0]?.value || '0';

  return {
    chain: 'BTC',
    to,
    amount,
  };
}

/**
 * Estimates transaction fee
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @param feeRate - Fee rate in sat/vB
 * @param addressType - Address type
 * @returns Estimated fee in satoshis
 */
export function estimateFee(
  inputCount: number,
  outputCount: number,
  feeRate: number,
  addressType: BtcAddressType = 'native-segwit'
): string {
  const size = estimateTxSize(inputCount, outputCount, addressType);
  return Math.ceil(size * feeRate).toString();
}
