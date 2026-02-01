/**
 * Crypto utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  checksum,
  randomBytes,
  generateSecureId,
} from '../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'This is a secret message';
      const password = 'mySecurePassword123';

      const encrypted = await encrypt(plaintext, password);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.algorithm).toBe('AES-GCM');

      const decrypted = await decrypt(
        encrypted.ciphertext,
        password,
        encrypted.salt,
        encrypted.iv,
        encrypted.iterations
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong password', async () => {
      const plaintext = 'Secret data';
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';

      const encrypted = await encrypt(plaintext, password);

      await expect(
        decrypt(
          encrypted.ciphertext,
          wrongPassword,
          encrypted.salt,
          encrypted.iv,
          encrypted.iterations
        )
      ).rejects.toThrow();
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'Same message';
      const password = 'samePassword';

      const encrypted1 = await encrypt(plaintext, password);
      const encrypted2 = await encrypt(plaintext, password);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('hashPassword/verifyPassword', () => {
    it('should hash and verify password correctly', () => {
      const password = 'myPassword123';

      const { hash, salt } = hashPassword(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should reject wrong password', () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';

      const { hash, salt } = hashPassword(password);

      expect(verifyPassword(wrongPassword, hash, salt)).toBe(false);
    });

    it('should produce consistent hashes with same salt', () => {
      const password = 'testPassword';

      const result1 = hashPassword(password);
      const result2 = hashPassword(password, result1.salt);

      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('checksum', () => {
    it('should generate consistent checksums', () => {
      const data = 'test data for checksum';

      const checksum1 = checksum(data);
      const checksum2 = checksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different data', () => {
      const data1 = 'first data';
      const data2 = 'second data';

      expect(checksum(data1)).not.toBe(checksum(data2));
    });
  });

  describe('randomBytes', () => {
    it('should generate bytes of correct length', () => {
      const bytes16 = randomBytes(16);
      const bytes32 = randomBytes(32);

      expect(bytes16.length).toBe(16);
      expect(bytes32.length).toBe(32);
    });

    it('should generate different values each time', () => {
      const bytes1 = randomBytes(16);
      const bytes2 = randomBytes(16);

      expect(Buffer.from(bytes1).toString('hex')).not.toBe(
        Buffer.from(bytes2).toString('hex')
      );
    });
  });

  describe('generateSecureId', () => {
    it('should generate valid hex string', () => {
      const id = generateSecureId();

      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureId());
      }

      expect(ids.size).toBe(100);
    });
  });
});
