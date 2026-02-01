/**
 * Bitcoin utility functions
 */

import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import type { BtcAddressType } from '@/types';

// Initialize the ECC library for bitcoinjs-lib
initEccLib(ecc);

/** Bitcoin network configuration */
export const BTC_NETWORKS = {
  mainnet: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
} as const;

/** Get default network (mainnet for production) */
export function getNetwork(): bitcoin.Network {
  return BTC_NETWORKS.mainnet;
}

/**
 * Validates a Bitcoin address
 * @param address - Address to validate
 * @returns true if valid
 */
export function isValidBtcAddress(address: string): boolean {
  try {
    bitcoin.address.toOutputScript(address, getNetwork());
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines the address type from a Bitcoin address
 * @param address - Bitcoin address
 * @returns Address type or undefined if invalid
 */
export function getAddressType(address: string): BtcAddressType | undefined {
  if (!address) return undefined;

  // Legacy (P2PKH) - starts with 1
  if (address.startsWith('1')) {
    return 'legacy';
  }

  // SegWit (P2SH-P2WPKH) - starts with 3
  if (address.startsWith('3')) {
    return 'segwit';
  }

  // Native SegWit (P2WPKH) - starts with bc1q
  if (address.startsWith('bc1q')) {
    return 'native-segwit';
  }

  // Taproot (P2TR) - starts with bc1p
  if (address.startsWith('bc1p')) {
    return 'taproot';
  }

  return undefined;
}

/**
 * Derives a Bitcoin address from a public key
 * @param publicKeyHex - Public key in hex format
 * @param addressType - Type of address to generate
 * @returns Bitcoin address
 */
export function deriveAddress(
  publicKeyHex: string,
  addressType: BtcAddressType = 'native-segwit'
): string {
  const publicKey = Buffer.from(publicKeyHex, 'hex');
  const network = getNetwork();

  switch (addressType) {
    case 'legacy': {
      const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey, network });
      if (!address) throw new Error('Failed to derive legacy address');
      return address;
    }

    case 'segwit': {
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
      const { address } = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
      if (!address) throw new Error('Failed to derive segwit address');
      return address;
    }

    case 'native-segwit': {
      const { address } = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
      if (!address) throw new Error('Failed to derive native-segwit address');
      return address;
    }

    case 'taproot': {
      // For taproot, we need to use the x-only public key (32 bytes)
      const xOnlyPubKey = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
      const { address } = bitcoin.payments.p2tr({
        internalPubkey: xOnlyPubKey,
        network,
      });
      if (!address) throw new Error('Failed to derive taproot address');
      return address;
    }

    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
}

/**
 * Calculates transaction size for fee estimation
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @param addressType - Address type for size calculation
 * @returns Estimated transaction size in virtual bytes
 */
export function estimateTxSize(
  inputCount: number,
  outputCount: number,
  addressType: BtcAddressType = 'native-segwit'
): number {
  // Base size
  const baseSize = 10; // version (4) + locktime (4) + input/output counts (2)

  // Input sizes vary by type
  const inputSizes: Record<BtcAddressType, number> = {
    legacy: 148, // P2PKH input
    segwit: 91, // P2SH-P2WPKH input (witness discount applied)
    'native-segwit': 68, // P2WPKH input (witness discount applied)
    taproot: 57.5, // P2TR input (witness discount applied)
  };

  // Output sizes
  const outputSizes: Record<BtcAddressType, number> = {
    legacy: 34, // P2PKH output
    segwit: 32, // P2SH output
    'native-segwit': 31, // P2WPKH output
    taproot: 43, // P2TR output
  };

  const inputSize = inputSizes[addressType];
  const outputSize = outputSizes[addressType];

  return Math.ceil(baseSize + inputCount * inputSize + outputCount * outputSize);
}

/**
 * Converts satoshis to BTC string
 * @param satoshis - Amount in satoshis
 * @returns BTC amount as string
 */
export function satoshiToBtc(satoshis: string | number): string {
  const sats = BigInt(satoshis);
  const btc = Number(sats) / 100000000;
  return btc.toFixed(8);
}

/**
 * Converts BTC to satoshis
 * @param btc - Amount in BTC
 * @returns Satoshi amount as string
 */
export function btcToSatoshi(btc: string | number): string {
  const amount = typeof btc === 'string' ? parseFloat(btc) : btc;
  return Math.round(amount * 100000000).toString();
}
