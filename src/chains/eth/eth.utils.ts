/**
 * Ethereum utility functions
 */

import { ethers } from 'ethers';

/**
 * Validates an Ethereum address
 * @param address - Address to validate
 * @returns true if valid
 */
export function isValidEthAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Converts a checksum address to lowercase
 * @param address - Ethereum address
 * @returns Lowercase address
 */
export function toLowerAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Gets checksum address
 * @param address - Ethereum address
 * @returns Checksum address
 */
export function toChecksumAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Converts wei to ETH string
 * @param wei - Amount in wei
 * @returns ETH amount as string
 */
export function weiToEth(wei: string | bigint): string {
  return ethers.formatEther(wei);
}

/**
 * Converts ETH to wei
 * @param eth - Amount in ETH
 * @returns Wei amount as string
 */
export function ethToWei(eth: string | number): string {
  return ethers.parseEther(eth.toString()).toString();
}

/**
 * Converts gwei to wei
 * @param gwei - Amount in gwei
 * @returns Wei amount as string
 */
export function gweiToWei(gwei: string | number): string {
  return ethers.parseUnits(gwei.toString(), 'gwei').toString();
}

/**
 * Converts wei to gwei
 * @param wei - Amount in wei
 * @returns Gwei amount as string
 */
export function weiToGwei(wei: string | bigint): string {
  return ethers.formatUnits(wei, 'gwei');
}

/**
 * Derives address from public key
 * @param publicKeyHex - Uncompressed public key in hex (65 bytes with 04 prefix)
 * @returns Ethereum address
 */
export function deriveAddressFromPublicKey(publicKeyHex: string): string {
  // Remove 0x prefix if present
  let pubKey = publicKeyHex.startsWith('0x')
    ? publicKeyHex.slice(2)
    : publicKeyHex;

  // For compressed public key (33 bytes), we need to decompress
  // For uncompressed (65 bytes with 04 prefix), remove the prefix
  if (pubKey.length === 66 && pubKey.startsWith('04')) {
    pubKey = pubKey.slice(2); // Remove 04 prefix
  } else if (pubKey.length === 130 && pubKey.startsWith('04')) {
    pubKey = pubKey.slice(2);
  }

  // Keccak256 of the public key (x,y coordinates without prefix)
  const hash = ethers.keccak256('0x' + pubKey);

  // Take last 20 bytes (40 hex chars)
  const address = '0x' + hash.slice(-40);

  return ethers.getAddress(address);
}

/**
 * Estimates gas for a simple ETH transfer
 * @returns Estimated gas limit
 */
export function estimateTransferGas(): bigint {
  return BigInt(21000);
}

/**
 * Validates transaction data
 * @param data - Transaction data hex
 * @returns true if valid hex
 */
export function isValidTxData(data: string): boolean {
  if (!data || data === '0x') return true;
  return /^0x[0-9a-fA-F]*$/.test(data);
}
