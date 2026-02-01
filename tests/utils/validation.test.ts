/**
 * Validation utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateMnemonic,
  validateDerivationPath,
  validateLabel,
  validatePassword,
  sanitizeInput,
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateAmount', () => {
    it('should validate valid amounts', () => {
      expect(validateAmount('1').valid).toBe(true);
      expect(validateAmount('0.5').valid).toBe(true);
      expect(validateAmount('100.12345678').valid).toBe(true);
      expect(validateAmount('0.00000001').valid).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount('').valid).toBe(false);
      expect(validateAmount('0').valid).toBe(false);
      expect(validateAmount('-1').valid).toBe(false);
      expect(validateAmount('abc').valid).toBe(false);
      expect(validateAmount('1.123456789').valid).toBe(false); // Too many decimals
    });

    it('should respect decimal limit', () => {
      expect(validateAmount('1.12', 2).valid).toBe(true);
      expect(validateAmount('1.123', 2).valid).toBe(false);
    });
  });

  describe('validateMnemonic', () => {
    it('should validate valid mnemonics', () => {
      const mnemonic12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const mnemonic24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

      expect(validateMnemonic(mnemonic12).valid).toBe(true);
      expect(validateMnemonic(mnemonic12).wordCount).toBe(12);

      expect(validateMnemonic(mnemonic24).valid).toBe(true);
      expect(validateMnemonic(mnemonic24).wordCount).toBe(24);
    });

    it('should reject invalid word counts', () => {
      const mnemonic11 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
      expect(validateMnemonic(mnemonic11).valid).toBe(false);
    });

    it('should reject non-alphabetic words', () => {
      const invalid = 'abandon 123 abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      expect(validateMnemonic(invalid).valid).toBe(false);
    });
  });

  describe('validateDerivationPath', () => {
    it('should validate valid paths', () => {
      expect(validateDerivationPath("m/44'/0'/0'/0/0").valid).toBe(true);
      expect(validateDerivationPath("m/84'/0'/0'/0/0").valid).toBe(true);
      expect(validateDerivationPath("m/44'/60'/0'/0/0").valid).toBe(true);
    });

    it('should reject invalid paths', () => {
      expect(validateDerivationPath('').valid).toBe(false);
      expect(validateDerivationPath("44'/0'/0'/0/0").valid).toBe(false); // Missing m/
      expect(validateDerivationPath('m/invalid').valid).toBe(false);
    });
  });

  describe('validateLabel', () => {
    it('should validate valid labels', () => {
      expect(validateLabel('').valid).toBe(true); // Optional
      expect(validateLabel('My Wallet').valid).toBe(true);
      expect(validateLabel('wallet-1').valid).toBe(true);
      expect(validateLabel('wallet_2').valid).toBe(true);
    });

    it('should reject invalid labels', () => {
      const longLabel = 'a'.repeat(51);
      expect(validateLabel(longLabel).valid).toBe(false);
      expect(validateLabel('invalid<script>').valid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate valid passwords', () => {
      expect(validatePassword('password123').valid).toBe(true);
      expect(validatePassword('12345678').valid).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(validatePassword('short').valid).toBe(false);
      expect(validatePassword('1234567').valid).toBe(false);
    });

    it('should respect custom minimum length', () => {
      expect(validatePassword('12345', 5).valid).toBe(true);
      expect(validatePassword('1234', 5).valid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    it('should handle empty/invalid input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as unknown as string)).toBe('');
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });
  });
});
