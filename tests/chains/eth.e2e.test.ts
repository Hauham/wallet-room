/**
 * ETH End-to-End Test: Wallet Creation → Transaction Building → Signing → Broadcast
 *
 * This test simulates the complete flow of:
 * 1. Creating a wallet from mnemonic
 * 2. Deriving address from public key
 * 3. Building an unsigned transaction
 * 4. Signing the transaction
 * 5. Verifying the signed transaction (simulating broadcast readiness)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as bip39 from 'bip39';
import { ethers, Transaction } from 'ethers';
import {
  EthService,
  deriveFromMnemonic,
  deriveAddressFromPublicKey,
  buildTransaction,
  signTransaction,
  parseTransaction,
  ethToWei,
  weiToEth,
} from '../../src/chains/eth';
import type { UnsignedTransaction, SignedTransaction } from '../../src/types';

/** Test mnemonic - BIP39 standard test vector */
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/** Standard ETH derivation path */
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

/** Expected address for the test mnemonic at the derivation path */
const EXPECTED_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';

describe('ETH E2E: Wallet → Transaction → Sign → Broadcast', () => {
  let ethService: EthService;
  let wallet: {
    publicKey: string;
    address: string;
    privateKey?: string;
  };
  let unsignedTx: UnsignedTransaction;
  let signedTx: SignedTransaction;

  beforeAll(() => {
    ethService = new EthService();
  });

  describe('Step 1: Wallet Creation', () => {
    it('should generate valid mnemonic', () => {
      const mnemonic = bip39.generateMnemonic(128);
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
      expect(mnemonic.split(' ').length).toBe(12);
    });

    it('should derive wallet from mnemonic', () => {
      wallet = deriveFromMnemonic(TEST_MNEMONIC, ETH_DERIVATION_PATH);

      expect(wallet.address).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.privateKey).toBeDefined();
      expect(wallet.address.startsWith('0x')).toBe(true);
      expect(wallet.address.length).toBe(42);
    });

    it('should derive correct address matching known test vector', () => {
      expect(wallet.address.toLowerCase()).toBe(EXPECTED_ADDRESS.toLowerCase());
    });

    it('should derive address from public key correctly', () => {
      const derivedAddress = deriveAddressFromPublicKey(wallet.publicKey);
      expect(derivedAddress.toLowerCase()).toBe(wallet.address.toLowerCase());
    });

    it('should derive address from public key via EthService', () => {
      const derivedAddress = ethService.deriveAddress(wallet.publicKey);
      expect(derivedAddress.toLowerCase()).toBe(wallet.address.toLowerCase());
    });

    it('should derive consistent addresses from seed', async () => {
      const seed = await bip39.mnemonicToSeed(TEST_MNEMONIC);
      const result = ethService.deriveFromSeed(
        Buffer.from(seed),
        ETH_DERIVATION_PATH
      );

      expect(result.address.toLowerCase()).toBe(wallet.address.toLowerCase());
      expect(result.publicKey).toBe(wallet.publicKey);
    });
  });

  describe('Step 2: Transaction Building', () => {
    const recipientAddress = '0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3';
    const sendAmount = '0.1'; // ETH

    it('should validate addresses', () => {
      expect(ethService.validateAddress(wallet.address)).toBe(true);
      expect(ethService.validateAddress(recipientAddress)).toBe(true);
      expect(ethService.validateAddress('invalid')).toBe(false);
    });

    it('should build unsigned transaction', async () => {
      unsignedTx = await ethService.buildTransaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: recipientAddress,
          amount: sendAmount,
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 0,
        }
      );

      expect(unsignedTx).toBeDefined();
      expect(unsignedTx.id).toBeDefined();
      expect(unsignedTx.chain).toBe('ETH');
      expect(unsignedTx.from.toLowerCase()).toBe(wallet.address.toLowerCase());
      expect(unsignedTx.to.toLowerCase()).toBe(recipientAddress.toLowerCase());
      expect(unsignedTx.nonce).toBe(0);
    });

    it('should convert amount to wei correctly', () => {
      const expectedWei = ethToWei(sendAmount);
      expect(unsignedTx.amount).toBe(expectedWei);
      expect(weiToEth(unsignedTx.amount)).toBe('0.1');
    });

    it('should set gas parameters', () => {
      expect(unsignedTx.gasLimit).toBeDefined();
      expect(unsignedTx.gasPrice).toBeDefined();
      expect(BigInt(unsignedTx.gasLimit!)).toBeGreaterThan(0n);
      expect(BigInt(unsignedTx.gasPrice!)).toBeGreaterThan(0n);
    });

    it('should calculate fee correctly', () => {
      const expectedFee = BigInt(unsignedTx.gasLimit!) * BigInt(unsignedTx.gasPrice!);
      expect(BigInt(unsignedTx.fee)).toBe(expectedFee);
    });

    it('should build transaction with memo/data', async () => {
      const txWithMemo = await ethService.buildTransaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: recipientAddress,
          amount: sendAmount,
          memo: 'Test memo',
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 1,
        }
      );

      expect(txWithMemo.memo).toBe('Test memo');
      expect(txWithMemo.data).toBeDefined();
      expect(txWithMemo.data).not.toBe('0x');
    });
  });

  describe('Step 3: Transaction Signing', () => {
    it('should sign the transaction', async () => {
      signedTx = await ethService.signTransaction(unsignedTx, wallet.privateKey!);

      expect(signedTx).toBeDefined();
      expect(signedTx.unsignedTxId).toBe(unsignedTx.id);
      expect(signedTx.chain).toBe('ETH');
      expect(signedTx.signature).toBeDefined();
      expect(signedTx.serialized).toBeDefined();
      expect(signedTx.txHash).toBeDefined();
    });

    it('should produce valid serialized transaction', () => {
      expect(signedTx.serialized.startsWith('0x')).toBe(true);
      expect(signedTx.serialized.length).toBeGreaterThan(2);
    });

    it('should produce valid transaction hash', () => {
      expect(signedTx.txHash.startsWith('0x')).toBe(true);
      expect(signedTx.txHash.length).toBe(66); // 0x + 64 hex chars
    });

    it('should have consistent txHash', () => {
      // Verify txHash is keccak256 of serialized transaction
      const computedHash = ethers.keccak256(signedTx.serialized);
      expect(signedTx.txHash).toBe(computedHash);
    });

    it('should contain correct signer address', () => {
      const tx = Transaction.from(signedTx.serialized);
      expect(tx.from?.toLowerCase()).toBe(wallet.address.toLowerCase());
    });
  });

  describe('Step 4: Transaction Verification (Broadcast Simulation)', () => {
    it('should serialize transaction for broadcast', () => {
      const serialized = ethService.serializeTransaction(signedTx);
      expect(serialized).toBe(signedTx.serialized);
    });

    it('should parse serialized transaction correctly', () => {
      const parsed = ethService.parseTransaction(signedTx.serialized);

      expect(parsed.chain).toBe('ETH');
      expect(parsed.from?.toLowerCase()).toBe(wallet.address.toLowerCase());
      expect(parsed.to?.toLowerCase()).toBe(unsignedTx.to.toLowerCase());
      expect(parsed.amount).toBe(unsignedTx.amount);
      expect(parsed.nonce).toBe(unsignedTx.nonce);
    });

    it('should verify transaction can be decoded by ethers', () => {
      const tx = Transaction.from(signedTx.serialized);

      expect(tx.to?.toLowerCase()).toBe(unsignedTx.to.toLowerCase());
      expect(tx.value.toString()).toBe(unsignedTx.amount);
      expect(tx.nonce).toBe(unsignedTx.nonce);
      expect(tx.chainId).toBe(BigInt(unsignedTx.chainId || 1));
    });

    it('should have valid signature', () => {
      const tx = Transaction.from(signedTx.serialized);
      expect(tx.signature).toBeDefined();
      expect(tx.isSigned()).toBe(true);
    });

    it('should broadcast throw in offline mode', async () => {
      await expect(
        ethService.broadcastTransaction(signedTx.serialized)
      ).rejects.toThrow('Broadcasting not available in offline mode');
    });
  });

  describe('Step 5: EIP-1559 Transaction Flow', () => {
    let eip1559UnsignedTx: UnsignedTransaction;
    let eip1559SignedTx: SignedTransaction;

    it('should build EIP-1559 transaction', async () => {
      const { buildEip1559Transaction } = await import('../../src/chains/eth/eth.transaction');

      eip1559UnsignedTx = buildEip1559Transaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: '0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3',
          amount: '0.05',
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 2,
        },
        ethers.parseUnits('50', 'gwei').toString(), // maxFeePerGas
        ethers.parseUnits('2', 'gwei').toString()   // maxPriorityFeePerGas
      );

      expect(eip1559UnsignedTx.maxFeePerGas).toBeDefined();
      expect(eip1559UnsignedTx.maxPriorityFeePerGas).toBeDefined();
      expect(eip1559UnsignedTx.gasPrice).toBeUndefined();
    });

    it('should sign EIP-1559 transaction', async () => {
      eip1559SignedTx = await ethService.signTransaction(
        eip1559UnsignedTx,
        wallet.privateKey!
      );

      expect(eip1559SignedTx.serialized.startsWith('0x')).toBe(true);
      expect(eip1559SignedTx.txHash.length).toBe(66);
    });

    it('should parse EIP-1559 transaction correctly', () => {
      const parsed = ethService.parseTransaction(eip1559SignedTx.serialized);

      expect(parsed.maxFeePerGas).toBe(eip1559UnsignedTx.maxFeePerGas);
      expect(parsed.maxPriorityFeePerGas).toBe(eip1559UnsignedTx.maxPriorityFeePerGas);
    });

    it('should verify EIP-1559 transaction type', () => {
      const tx = Transaction.from(eip1559SignedTx.serialized);
      expect(tx.type).toBe(2); // EIP-1559
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject invalid recipient address in validation', () => {
      expect(ethService.validateAddress('')).toBe(false);
      expect(ethService.validateAddress('0x123')).toBe(false);
      expect(ethService.validateAddress('invalid')).toBe(false);
    });

    it('should handle zero amount transaction', async () => {
      const zeroTx = await ethService.buildTransaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: '0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3',
          amount: '0',
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 3,
        }
      );

      expect(zeroTx.amount).toBe('0');

      const signedZeroTx = await ethService.signTransaction(zeroTx, wallet.privateKey!);
      expect(signedZeroTx.serialized).toBeDefined();
    });

    it('should handle large amount transaction', async () => {
      const largeTx = await ethService.buildTransaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: '0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3',
          amount: '1000000', // 1 million ETH
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 4,
        }
      );

      expect(BigInt(largeTx.amount)).toBe(BigInt('1000000000000000000000000')); // 1M * 10^18
    });

    it('should maintain transaction integrity through serialization', async () => {
      const originalTx = await ethService.buildTransaction(
        {
          chain: 'ETH',
          from: wallet.address,
          to: '0x742d35cc6634C0532925a3b844Bc9E7595f6B2F3',
          amount: '0.123456789',
        },
        {
          chain: 'ETH',
          address: wallet.address,
          nonce: 5,
        }
      );

      const signed = await ethService.signTransaction(originalTx, wallet.privateKey!);
      const parsed = ethService.parseTransaction(signed.serialized);

      expect(parsed.to?.toLowerCase()).toBe(originalTx.to.toLowerCase());
      expect(parsed.amount).toBe(originalTx.amount);
      expect(parsed.nonce).toBe(originalTx.nonce);
    });
  });
});
