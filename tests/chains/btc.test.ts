/**
 * Bitcoin chain service tests
 */

import { describe, it, expect } from 'vitest';
import * as bip39 from 'bip39';
import {
  BtcService,
  isValidBtcAddress,
  deriveAddress,
  satoshiToBtc,
  btcToSatoshi,
} from '../../src/chains/btc';

describe('BTC Utils', () => {
  describe('isValidBtcAddress', () => {
    it('should validate legacy address (P2PKH)', () => {
      expect(isValidBtcAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
    });

    it('should validate SegWit address (P2SH-P2WPKH)', () => {
      expect(isValidBtcAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
    });

    it('should validate native SegWit address (P2WPKH)', () => {
      expect(isValidBtcAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidBtcAddress('')).toBe(false);
      expect(isValidBtcAddress('invalid')).toBe(false);
      expect(isValidBtcAddress('0x123')).toBe(false);
    });
  });

  describe('satoshiToBtc', () => {
    it('should convert satoshis to BTC', () => {
      expect(satoshiToBtc('100000000')).toBe('1.00000000');
      expect(satoshiToBtc('50000000')).toBe('0.50000000');
      expect(satoshiToBtc('1')).toBe('0.00000001');
    });
  });

  describe('btcToSatoshi', () => {
    it('should convert BTC to satoshis', () => {
      expect(btcToSatoshi('1')).toBe('100000000');
      expect(btcToSatoshi('0.5')).toBe('50000000');
      expect(btcToSatoshi('0.00000001')).toBe('1');
    });
  });
});

describe('BtcService', () => {
  const service = new BtcService();

  describe('validateAddress', () => {
    it('should validate addresses', () => {
      expect(service.validateAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
      expect(service.validateAddress('invalid')).toBe(false);
    });
  });

  describe('deriveFromSeed', () => {
    it('should derive wallet from seed', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const result = service.deriveFromSeed(
        Buffer.from(seed),
        "m/84'/0'/0'/0/0",
        { addressType: 'native-segwit' }
      );

      expect(result.address).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.address.startsWith('bc1q')).toBe(true);
    });
  });

  describe('chain property', () => {
    it('should return BTC', () => {
      expect(service.chain).toBe('BTC');
    });
  });
});
