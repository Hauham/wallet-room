/**
 * XRP Ledger wallet operations
 */

import { Wallet, deriveKeypair, deriveAddress } from 'xrpl';
import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';

const bip32 = BIP32Factory(ecc);

/**
 * Derives XRP wallet from seed
 * @param seed - BIP39 seed buffer
 * @param derivationPath - HD derivation path
 * @returns Public key, address, and optionally private key
 */
export function deriveFromSeed(
  seed: Buffer,
  derivationPath: string
): { publicKey: string; address: string; privateKey?: string } {
  // Derive using BIP32
  const root = bip32.fromSeed(seed);
  const derived = root.derivePath(derivationPath);

  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }

  // XRP uses secp256k1, convert private key to XRP format
  const privateKeyHex = derived.privateKey.toString('hex').toUpperCase();

  // Derive keypair using XRPL library
  const keypair = deriveKeypair('00' + privateKeyHex);

  // Derive address from public key
  const address = deriveAddress(keypair.publicKey);

  return {
    publicKey: keypair.publicKey,
    address,
    privateKey: privateKeyHex,
  };
}

/**
 * Creates wallet from seed phrase using XRPL native derivation
 * @param mnemonic - BIP39 mnemonic
 * @returns Wallet info
 */
export function walletFromMnemonic(
  mnemonic: string
): { publicKey: string; address: string; privateKey?: string } {
  const wallet = Wallet.fromMnemonic(mnemonic);

  return {
    publicKey: wallet.publicKey,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Creates wallet from private key
 * @param privateKey - Private key hex
 * @returns Wallet info
 */
export function walletFromPrivateKey(
  privateKey: string
): { publicKey: string; address: string } {
  const keypair = deriveKeypair(privateKey);
  const address = deriveAddress(keypair.publicKey);

  return {
    publicKey: keypair.publicKey,
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
