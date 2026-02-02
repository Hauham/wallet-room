/**
 * Ethereum utility functions
 */

import { ethers } from 'ethers';

/**
 * Validates an Ethereum address
 * Accepts both checksummed and lowercase addresses
 * @param address - Address to validate
 * @returns true if valid
 */
export function isValidEthAddress(address: string): boolean {
  try {
    // ethers.isAddress is strict about checksum
    // We also accept lowercase addresses by trying to convert them
    if (ethers.isAddress(address)) {
      return true;
    }
    // Try to get checksum address - if it works, it's a valid address
    ethers.getAddress(address);
    return true;
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
 * Supports both compressed (33 bytes, 02/03 prefix) and uncompressed (65 bytes, 04 prefix) formats
 * @param publicKeyHex - Public key in hex format
 * @returns Ethereum checksum address
 */
export function deriveAddressFromPublicKey(publicKeyHex: string): string {
  // Normalize public key to have 0x prefix
  const normalizedPubKey = publicKeyHex.startsWith('0x')
    ? publicKeyHex
    : '0x' + publicKeyHex;

  // ethers.computeAddress handles both compressed and uncompressed public keys
  return ethers.computeAddress(normalizedPubKey);
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
