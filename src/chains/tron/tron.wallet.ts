/**
 * TRON wallet operations
 */

import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import { deriveAddressFromPublicKey } from './tron.utils';

const bip32 = BIP32Factory(ecc);

/**
 * Derives TRON wallet from seed
 * @param seed - BIP39 seed buffer
 * @param derivationPath - HD derivation path
 * @returns Public key, address, and optionally private key
 */
export function deriveFromSeed(
  seed: Buffer,
  derivationPath: string
): { publicKey: string; address: string; privateKey?: string } {
  const root = bip32.fromSeed(seed);
  const derived = root.derivePath(derivationPath);

  if (!derived.privateKey || !derived.publicKey) {
    throw new Error('Failed to derive keys');
  }

  // Get uncompressed public key for address derivation
  const uncompressedPubKey = Buffer.from(
    ecc.pointFromScalar(derived.privateKey, false)!
  );

  // Remove 04 prefix for address derivation
  const pubKeyWithoutPrefix = uncompressedPubKey.slice(1).toString('hex');

  const address = deriveAddressFromPublicKey(pubKeyWithoutPrefix);

  return {
    publicKey: derived.publicKey.toString('hex'),
    address,
    privateKey: derived.privateKey.toString('hex'),
  };
}

/**
 * Creates wallet from private key
 * @param privateKeyHex - Private key hex
 * @returns Wallet info
 */
export function walletFromPrivateKey(
  privateKeyHex: string
): { publicKey: string; address: string } {
  const privateKey = Buffer.from(privateKeyHex, 'hex');

  // Get compressed public key
  const compressedPubKey = Buffer.from(ecc.pointFromScalar(privateKey, true)!);

  // Get uncompressed public key for address
  const uncompressedPubKey = Buffer.from(ecc.pointFromScalar(privateKey, false)!);
  const pubKeyWithoutPrefix = uncompressedPubKey.slice(1).toString('hex');

  const address = deriveAddressFromPublicKey(pubKeyWithoutPrefix);

  return {
    publicKey: compressedPubKey.toString('hex'),
    address,
  };
}

/**
 * Derives multiple addresses from a seed
 * @param seed - BIP39 seed buffer
 * @param basePath - Base derivation path (without index)
 * @param startIndex - Starting index
 * @param count - Number of addresses to generate
 * @returns Array of address information
 */
export function deriveAddresses(
  seed: Buffer,
  basePath: string,
  startIndex: number,
  count: number
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
    const derived = deriveFromSeed(seed, path);

    addresses.push({
      index,
      path,
      address: derived.address,
      publicKey: derived.publicKey,
    });
  }

  return addresses;
}
