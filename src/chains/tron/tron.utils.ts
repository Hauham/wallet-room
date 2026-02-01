/**
 * TRON utility functions
 */

import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import bs58 from 'bs58';

/** TRON address prefix byte */
const TRON_ADDRESS_PREFIX = 0x41;

/**
 * Validates a TRON address
 * @param address - Address to validate (Base58 format starting with T)
 * @returns true if valid
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || !address.startsWith('T')) {
    return false;
  }

  try {
    const decoded = bs58.decode(address);
    if (decoded.length !== 25) {
      return false;
    }

    // Check prefix
    if (decoded[0] !== TRON_ADDRESS_PREFIX) {
      return false;
    }

    // Verify checksum
    const addressBytes = decoded.slice(0, 21);
    const checksum = decoded.slice(21);
    const hash = sha256(sha256(addressBytes));
    const expectedChecksum = hash.slice(0, 4);

    return Buffer.from(checksum).equals(Buffer.from(expectedChecksum));
  } catch {
    return false;
  }
}

/**
 * Converts hex address to Base58 TRON address
 * @param hexAddress - Hex address (41 prefix)
 * @returns Base58 TRON address
 */
export function hexToBase58Address(hexAddress: string): string {
  // Remove 0x prefix if present
  let hex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress;

  // Add TRON prefix if not present
  if (!hex.startsWith('41')) {
    hex = '41' + hex;
  }

  const addressBytes = Buffer.from(hex, 'hex');

  // Calculate checksum
  const hash = sha256(sha256(addressBytes));
  const checksum = hash.slice(0, 4);

  // Combine address and checksum
  const addressWithChecksum = Buffer.concat([addressBytes, Buffer.from(checksum)]);

  return bs58.encode(addressWithChecksum);
}

/**
 * Converts Base58 TRON address to hex
 * @param base58Address - Base58 TRON address
 * @returns Hex address with 41 prefix
 */
export function base58ToHexAddress(base58Address: string): string {
  const decoded = bs58.decode(base58Address);
  const addressBytes = decoded.slice(0, 21);
  return Buffer.from(addressBytes).toString('hex');
}

/**
 * Derives TRON address from public key
 * @param publicKeyHex - Public key in hex (uncompressed, without 04 prefix)
 * @returns Base58 TRON address
 */
export function deriveAddressFromPublicKey(publicKeyHex: string): string {
  // Remove 04 prefix if present (uncompressed public key)
  let pubKey = publicKeyHex;
  if (pubKey.startsWith('04')) {
    pubKey = pubKey.slice(2);
  }
  if (pubKey.startsWith('0x')) {
    pubKey = pubKey.slice(2);
  }

  // Keccak256 hash of public key
  const pubKeyBytes = Buffer.from(pubKey, 'hex');
  const hash = keccak_256(pubKeyBytes);

  // Take last 20 bytes
  const addressBytes = hash.slice(-20);

  // Add TRON prefix
  const addressWithPrefix = Buffer.concat([Buffer.from([TRON_ADDRESS_PREFIX]), Buffer.from(addressBytes)]);

  // Calculate checksum
  const checksumHash = sha256(sha256(addressWithPrefix));
  const checksum = checksumHash.slice(0, 4);

  // Encode to Base58
  const addressWithChecksum = Buffer.concat([addressWithPrefix, Buffer.from(checksum)]);

  return bs58.encode(addressWithChecksum);
}

/**
 * Converts SUN to TRX string
 * @param sun - Amount in SUN
 * @returns TRX amount as string
 */
export function sunToTrx(sun: string | number | bigint): string {
  const sunNum = BigInt(sun);
  const trx = Number(sunNum) / 1000000;
  return trx.toFixed(6);
}

/**
 * Converts TRX to SUN
 * @param trx - Amount in TRX
 * @returns SUN amount as string
 */
export function trxToSun(trx: string | number): string {
  const amount = typeof trx === 'string' ? parseFloat(trx) : trx;
  return Math.round(amount * 1000000).toString();
}

/**
 * Standard bandwidth fee in SUN (for simple transfers)
 */
export const BANDWIDTH_FEE_SUN = '100000'; // 0.1 TRX
