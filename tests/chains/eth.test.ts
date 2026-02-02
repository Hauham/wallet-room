/**
 * Ethereum chain service tests
 */

import { describe, it, expect } from 'vitest';
import * as bip39 from 'bip39';
import {
  EthService,
  isValidEthAddress,
  weiToEth,
  ethToWei,
  gweiToWei,
} from '../../src/chains/eth';

describe('ETH Utils', () => {
  describe('isValidEthAddress', () => {
    it('should validate valid Ethereum addresses', () => {
      // Correct checksummed address
      expect(isValidEthAddress('0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3')).toBe(true);
      // Zero address
      expect(isValidEthAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      // Lowercase address should also be valid
      expect(isValidEthAddress('0x742d35cc6634c0532925a3b844bc9e7595f6b2f3')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidEthAddress('')).toBe(false);
      expect(isValidEthAddress('invalid')).toBe(false);
      expect(isValidEthAddress('0x123')).toBe(false);
      expect(isValidEthAddress('bc1qtest')).toBe(false);
    });
  });

  describe('weiToEth', () => {
    it('should convert wei to ETH', () => {
      expect(weiToEth('1000000000000000000')).toBe('1.0');
      expect(weiToEth('500000000000000000')).toBe('0.5');
      expect(weiToEth(BigInt('1000000000000000000'))).toBe('1.0');
    });
  });

  describe('ethToWei', () => {
    it('should convert ETH to wei', () => {
      expect(ethToWei('1')).toBe('1000000000000000000');
      expect(ethToWei('0.5')).toBe('500000000000000000');
      expect(ethToWei(1)).toBe('1000000000000000000');
    });
  });

  describe('gweiToWei', () => {
    it('should convert gwei to wei', () => {
      expect(gweiToWei('1')).toBe('1000000000');
      expect(gweiToWei('20')).toBe('20000000000');
    });
  });
});

describe('EthService', () => {
  const service = new EthService();

  describe('validateAddress', () => {
    it('should validate Ethereum addresses', () => {
      // Correct checksummed address
      expect(service.validateAddress('0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3')).toBe(true);
      // Lowercase address should also be valid
      expect(service.validateAddress('0x742d35cc6634c0532925a3b844bc9e7595f6b2f3')).toBe(true);
      expect(service.validateAddress('invalid')).toBe(false);
    });
  });

  describe('deriveFromSeed', () => {
    it('should derive wallet from seed', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const result = service.deriveFromSeed(
        Buffer.from(seed),
        "m/44'/60'/0'/0/0"
      );

      expect(result.address).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.address.startsWith('0x')).toBe(true);
      expect(result.address.length).toBe(42);
    });

    it('should derive consistent addresses', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const result1 = service.deriveFromSeed(Buffer.from(seed), "m/44'/60'/0'/0/0");
      const result2 = service.deriveFromSeed(Buffer.from(seed), "m/44'/60'/0'/0/0");

      expect(result1.address).toBe(result2.address);
      expect(result1.publicKey).toBe(result2.publicKey);
    });
  });

  describe('chain property', () => {
    it('should return ETH', () => {
      expect(service.chain).toBe('ETH');
    });
  });
});
