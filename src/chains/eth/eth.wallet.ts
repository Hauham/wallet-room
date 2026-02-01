/**
 * Ethereum wallet operations
 */

import { ethers, HDNodeWallet } from 'ethers';

/**
 * Derives ETH wallet from seed
 * @param seed - BIP39 seed buffer
 * @param derivationPath - HD derivation path
 * @returns Public key, address, and optionally private key
 */
export function deriveFromSeed(
  seed: Buffer,
  derivationPath: string
): { publicKey: string; address: string; privateKey?: string } {
  // Create HD wallet from seed
  const hdNode = HDNodeWallet.fromSeed(seed);

  // Derive child at path
  const derived = hdNode.derivePath(derivationPath);

  return {
    publicKey: derived.publicKey,
    address: derived.address,
    privateKey: derived.privateKey,
  };
}

/**
 * Derives wallet from mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param derivationPath - HD derivation path
 * @returns Wallet instance
 */
export function deriveFromMnemonic(
  mnemonic: string,
  derivationPath: string
): { publicKey: string; address: string; privateKey?: string } {
  const hdNode = HDNodeWallet.fromPhrase(mnemonic);
  const derived = hdNode.derivePath(derivationPath);

  return {
    publicKey: derived.publicKey,
    address: derived.address,
    privateKey: derived.privateKey,
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
  const wallet = new ethers.Wallet(privateKey);
  return {
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address,
  };
}

/**
 * Derives multiple addresses from a seed for a given path range
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

  const hdNode = HDNodeWallet.fromSeed(seed);

  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    const path = `${basePath}/${index}`;
    const derived = hdNode.derivePath(path);

    addresses.push({
      index,
      path,
      address: derived.address,
      publicKey: derived.publicKey,
    });
  }

  return addresses;
}
