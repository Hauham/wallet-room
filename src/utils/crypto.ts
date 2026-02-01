/**
 * Cryptographic utility functions
 * Uses Web Crypto API for secure operations
 */

import { sha256 } from '@noble/hashes/sha256';

/** Encryption algorithm */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Generates cryptographically secure random bytes
 * @param length - Number of bytes to generate
 * @returns Random bytes as Uint8Array
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derives an encryption key from a password using PBKDF2
 * @param password - User password
 * @param salt - Salt bytes
 * @param iterations - PBKDF2 iterations
 * @returns Derived CryptoKey
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param password - Encryption password
 * @returns Encrypted data with salt and IV
 */
export async function encrypt(
  plaintext: string,
  password: string
): Promise<{
  ciphertext: string;
  salt: string;
  iv: string;
  iterations: number;
  algorithm: string;
}> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Generate salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key and encrypt
  const key = await deriveKey(password, salt);
  const ciphertextBytes = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    plaintextBytes
  );

  return {
    ciphertext: Buffer.from(ciphertextBytes).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    iterations: ITERATIONS,
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param ciphertext - Base64-encoded ciphertext
 * @param password - Decryption password
 * @param salt - Base64-encoded salt
 * @param iv - Base64-encoded IV
 * @param iterations - PBKDF2 iterations used
 * @returns Decrypted plaintext
 */
export async function decrypt(
  ciphertext: string,
  password: string,
  salt: string,
  iv: string,
  iterations: number = ITERATIONS
): Promise<string> {
  const ciphertextBytes = Buffer.from(ciphertext, 'base64');
  const saltBytes = Buffer.from(salt, 'base64');
  const ivBytes = Buffer.from(iv, 'base64');

  // Derive key and decrypt
  const key = await deriveKey(password, saltBytes, iterations);
  const plaintextBytes = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivBytes,
    },
    key,
    ciphertextBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBytes);
}

/**
 * Hashes a password for storage verification
 * @param password - Password to hash
 * @param salt - Optional salt (generated if not provided)
 * @returns Hash and salt
 */
export function hashPassword(
  password: string,
  salt?: string
): { hash: string; salt: string } {
  const saltBytes = salt
    ? Buffer.from(salt, 'base64')
    : randomBytes(SALT_LENGTH);

  const encoder = new TextEncoder();
  const combined = new Uint8Array([
    ...saltBytes,
    ...encoder.encode(password),
  ]);

  const hash = sha256(combined);

  return {
    hash: Buffer.from(hash).toString('base64'),
    salt: Buffer.from(saltBytes).toString('base64'),
  };
}

/**
 * Verifies a password against a stored hash
 * @param password - Password to verify
 * @param storedHash - Stored hash
 * @param salt - Salt used for hashing
 * @returns true if password matches
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

/**
 * Generates a checksum for data integrity verification
 * @param data - Data to checksum
 * @returns SHA-256 checksum in hex
 */
export function checksum(data: string): string {
  const encoder = new TextEncoder();
  const hash = sha256(encoder.encode(data));
  return Buffer.from(hash).toString('hex');
}

/**
 * Securely clears sensitive data from a string
 * Note: This is best-effort in JavaScript due to string immutability
 * @param data - String to clear (will be overwritten if possible)
 */
export function secureClear(data: string): void {
  // In JavaScript, strings are immutable, so we can't truly clear them
  // This is a placeholder for documentation purposes
  // The GC will eventually clean up the string

  // For arrays/buffers, we can actually clear them:
  if (data && typeof data === 'object' && 'fill' in data) {
    (data as unknown as Uint8Array).fill(0);
  }
}

/**
 * Generates a secure random ID
 * @returns Random hex string
 */
export function generateSecureId(): string {
  return Buffer.from(randomBytes(16)).toString('hex');
}
