import { describe, it, expect } from 'vitest';
import { buildTransaction, signTransaction } from '../../src/chains/eth/eth.transaction';

describe('ETH transaction signing', () => {
  it('should produce serialized tx and valid txHash', () => {
    const unsigned = buildTransaction(
      {
        chain: 'ETH',
        from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        amount: '10000000000000000', // 0.01 ETH in wei
      },
      { nonce: 0 }
    );

    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const signed = signTransaction(unsigned, privateKey);

    expect(typeof signed.serialized).toBe('string');
    expect(signed.serialized.startsWith('0x')).toBe(true);
    expect(typeof signed.txHash).toBe('string');
    expect(signed.txHash.startsWith('0x')).toBe(true);
    expect(signed.txHash.length).toBe(66); // 0x + 64 hex chars
  });
});