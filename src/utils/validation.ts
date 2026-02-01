/**
 * Validation utility functions
 */

import type { Chain } from '@/types';
import { getChainService } from '@/chains';

/**
 * Validates an address for a specific chain
 * @param chain - Target chain
 * @param address - Address to validate
 * @returns true if valid
 */
export function validateAddress(chain: Chain, address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    const service = getChainService(chain);
    return service.validateAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validates a transaction amount
 * @param amount - Amount string
 * @param decimals - Number of decimal places allowed
 * @returns Validation result
 */
export function validateAmount(
  amount: string,
  decimals: number = 8
): { valid: boolean; error?: string } {
  if (!amount || typeof amount !== 'string') {
    return { valid: false, error: 'Amount is required' };
  }

  // Check for valid number format
  const regex = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!regex.test(amount)) {
    return { valid: false, error: `Invalid amount format (max ${decimals} decimals)` };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Invalid number' };
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (!isFinite(numAmount)) {
    return { valid: false, error: 'Amount is too large' };
  }

  return { valid: true };
}

/**
 * Validates a mnemonic phrase
 * @param mnemonic - Mnemonic phrase
 * @returns Validation result
 */
export function validateMnemonic(mnemonic: string): {
  valid: boolean;
  error?: string;
  wordCount?: number;
} {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return { valid: false, error: 'Mnemonic is required' };
  }

  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  const wordCount = words.length;

  // Valid word counts: 12, 15, 18, 21, 24
  const validWordCounts = [12, 15, 18, 21, 24];
  if (!validWordCounts.includes(wordCount)) {
    return {
      valid: false,
      error: `Invalid word count: ${wordCount}. Expected 12, 15, 18, 21, or 24 words`,
      wordCount,
    };
  }

  // Basic word format validation (alphabetic only)
  for (const word of words) {
    if (!/^[a-z]+$/.test(word)) {
      return {
        valid: false,
        error: `Invalid word format: "${word}"`,
        wordCount,
      };
    }
  }

  return { valid: true, wordCount };
}

/**
 * Validates a derivation path
 * @param path - HD derivation path
 * @returns Validation result
 */
export function validateDerivationPath(path: string): {
  valid: boolean;
  error?: string;
} {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Derivation path is required' };
  }

  // Must start with 'm/'
  if (!path.startsWith('m/')) {
    return { valid: false, error: 'Path must start with "m/"' };
  }

  // Valid path format: m/purpose'/coin'/account'/change/index
  const pathRegex = /^m(\/\d+'?)+$/;
  if (!pathRegex.test(path)) {
    return { valid: false, error: 'Invalid derivation path format' };
  }

  return { valid: true };
}

/**
 * Validates a wallet label
 * @param label - Wallet label
 * @returns Validation result
 */
export function validateLabel(label: string): {
  valid: boolean;
  error?: string;
} {
  if (!label) {
    return { valid: true }; // Label is optional
  }

  if (label.length > 50) {
    return { valid: false, error: 'Label must be 50 characters or less' };
  }

  // Allow alphanumeric, spaces, and common punctuation
  if (!/^[\w\s\-_.]+$/.test(label)) {
    return { valid: false, error: 'Label contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validates a password
 * @param password - Password to validate
 * @param minLength - Minimum required length
 * @returns Validation result
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  return { valid: true };
}

/**
 * Sanitizes user input
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.trim();
}
