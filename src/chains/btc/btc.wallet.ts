/**
 * Bitcoin wallet operations
 */

import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, type BIP32Interface } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import type { BtcAddressType } from '@/types';
import { deriveAddress, getNetwork } from './btc.utils';

// Create BIP32 instance with ECC library
const bip32 = BIP32Factory(ecc);

/**
 * Derives BTC wallet from seed
 * @param seed - BIP39 seed buffer
 * @param derivationPath - HD derivation path
 * @param addressType - Type of address to generate
 * @returns Public key, address, and optionally private key
 */
export function deriveFromSeed(
  seed: Buffer,
  derivationPath: string,
  addressType: BtcAddressType = 'native-segwit'
): { publicKey: string; address: string; privateKey?: string } {
  const network = getNetwork();
  const root: BIP32Interface = bip32.fromSeed(seed, network);
  const child = root.derivePath(derivationPath);

  if (!child.publicKey) {
    throw new Error('Failed to derive public key');
  }

  const publicKeyHex = child.publicKey.toString('hex');
  const address = deriveAddress(publicKeyHex, addressType);

  // Only include private key if available (won't be for watch-only)
  const result: { publicKey: string; address: string; privateKey?: string } = {
    publicKey: publicKeyHex,
    address,
  };

  if (child.privateKey) {
    result.privateKey = child.privateKey.toString('hex');
  }

  return result;
}

/**
 * Gets the payment type for a BTC address type
 * @param publicKey - Public key buffer
 * @param addressType - Address type
 * @returns Payment object
 */
export function getPayment(
  publicKey: Buffer,
  addressType: BtcAddressType
): bitcoin.Payment {
  const network = getNetwork();

  switch (addressType) {
    case 'legacy':
      return bitcoin.payments.p2pkh({ pubkey: publicKey, network });

    case 'segwit': {
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
      return bitcoin.payments.p2sh({ redeem: p2wpkh, network });
    }

    case 'native-segwit':
      return bitcoin.payments.p2wpkh({ pubkey: publicKey, network });

    case 'taproot': {
      const xOnlyPubKey = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
      return bitcoin.payments.p2tr({ internalPubkey: xOnlyPubKey, network });
    }

    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
}

/**
 * Derives multiple addresses from a seed for a given path range
 * @param seed - BIP39 seed buffer
 * @param basePath - Base derivation path (without index)
 * @param startIndex - Starting index
 * @param count - Number of addresses to generate
 * @param addressType - Type of address to generate
 * @returns Array of address information
 */
export function deriveAddresses(
  seed: Buffer,
  basePath: string,
  startIndex: number,
  count: number,
  addressType: BtcAddressType = 'native-segwit'
): Array<{ index: number; path: string; address: string; publicKey: string }> {
  const addresses: Array<{
    index: number;
    path: string;
    address: string;
    publicKey: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    const path = `${basePath}/${index}`;
    const derived = deriveFromSeed(seed, path, addressType);

    addresses.push({
      index,
      path,
      address: derived.address,
      publicKey: derived.publicKey,
    });
  }

  return addresses;
}
