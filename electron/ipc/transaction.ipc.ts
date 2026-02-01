/**
 * Transaction IPC Handlers
 * Handles transaction-related IPC calls from renderer
 */

import type { IpcMain } from 'electron';
import { walletService } from './wallet.ipc';
import { buildTransaction as btcBuild } from '../../src/chains/btc/btc.transaction';
import { buildTransaction as ethBuild } from '../../src/chains/eth/eth.transaction';
import { buildTransaction as xrpBuild } from '../../src/chains/xrp/xrp.transaction';
import { buildTransaction as tronBuild } from '../../src/chains/tron/tron.transaction';

interface BuildTransactionParams {
  chain: string;
  from: string;
  to: string;
  amount: string;
  memo?: string;
  feeRate?: number;
  gasLimit?: string;
  gasPrice?: string;
  destinationTag?: number;
}

interface TransactionPrerequisites {
  chain: string;
  address: string;
  nonce?: number;
  utxos?: unknown[];
  sequence?: number;
  refBlockBytes?: string;
  refBlockHash?: string;
}

interface UnsignedTransaction {
  id: string;
  chain: string;
  from: string;
  to: string;
  amount: string;
  fee: string;
  memo?: string;
  createdAt: number;
  [key: string]: unknown;
}

interface SignedTransaction {
  unsignedTxId: string;
  chain: string;
  unsignedTx: UnsignedTransaction;
  signature: string;
  serialized: string;
  txHash: string;
  signedAt: number;
}

interface TransactionRecord {
  id: string;
  chain: string;
  walletId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  fee: string;
  status: string;
  createdAt: number;
  signedAt?: number;
  broadcastAt?: number;
}

// Mock transaction service
class MockTransactionService {
  private transactions: TransactionRecord[] = [];
  private txCounter = 0;

  async buildTransaction(
    params: BuildTransactionParams,
    prerequisites: TransactionPrerequisites
  ): Promise<{ success: boolean; data?: UnsignedTransaction; error?: { message: string } }> {
    // Basic validation
    if (!params.from || !params.to || !params.amount) {
      return {
        success: false,
        error: { message: 'Missing required transaction parameters' },
      };
    }

    try {
      // Use real chain-specific build functions
      let unsignedTx: UnsignedTransaction;

      switch (params.chain) {
        case 'BTC':
          unsignedTx = btcBuild(params as any, prerequisites as any);
          break;
        case 'ETH':
          unsignedTx = ethBuild(params as any, prerequisites as any);
          break;
        case 'XRP':
          unsignedTx = xrpBuild(params as any, prerequisites as any);
          break;
        case 'TRON':
          unsignedTx = tronBuild(params as any, prerequisites as any);
          break;
        default:
          return {
            success: false,
            error: { message: `Unsupported chain: ${params.chain}` },
          };
      }

      return { success: true, data: unsignedTx };
    } catch (err) {
      console.error('[TransactionService] Build transaction error:', err);
      return {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Failed to build transaction' },
      };
    }
  }

  private getDefaultFee(chain: string): string {
    const fees: Record<string, string> = {
      BTC: '1000',
      ETH: '21000000000000',
      XRP: '12',
      TRON: '100000',
    };
    return fees[chain] || '0';
  }

  private getChainSpecificFields(
    params: BuildTransactionParams,
    prerequisites: TransactionPrerequisites
  ): Record<string, unknown> {
    switch (params.chain) {
      case 'BTC':
        return {
          utxos: prerequisites.utxos || [],
          feeRate: params.feeRate || 10,
          changeAddress: params.from,
        };
      case 'ETH':
        return {
          nonce: prerequisites.nonce || 0,
          gasLimit: params.gasLimit || '21000',
          gasPrice: params.gasPrice || '20000000000',
          chainId: 1,
        };
      case 'XRP':
        return {
          sequence: prerequisites.sequence || 0,
          destinationTag: params.destinationTag,
          lastLedgerSequence: (prerequisites.sequence || 0) + 20,
        };
      case 'TRON':
        return {
          expiration: Date.now() + 600000,
          refBlockBytes: prerequisites.refBlockBytes || '0000',
          refBlockHash: prerequisites.refBlockHash || '0000000000000000',
        };
      default:
        return {};
    }
  }

  async signTransaction(
    walletId: string,
    unsignedTx: UnsignedTransaction
  ): Promise<{ success: boolean; data?: SignedTransaction; error?: { message: string } }> {
    // If wallet service can sign, prefer real signing for supported chains (e.g., ETH)
    try {
      if (walletService && typeof walletService.signTransactionWithWallet === 'function') {
        const result = await walletService.signTransactionWithWallet(walletId, unsignedTx);
        if (result.success && result.data) {
          const signed = result.data as SignedTransaction;

          // Store transaction record
          const txRecord: TransactionRecord = {
            id: unsignedTx.id,
            chain: unsignedTx.chain,
            walletId,
            txHash: signed.txHash,
            from: unsignedTx.from,
            to: unsignedTx.to,
            amount: unsignedTx.amount,
            fee: unsignedTx.fee,
            status: 'signed',
            createdAt: unsignedTx.createdAt,
            signedAt: signed.signedAt,
          };

          this.transactions.push(txRecord);

          return { success: true, data: signed };
        }
      }
    } catch (err) {
      // Fall back to mock behavior if real signing fails
      console.warn('[TransactionService] Real signing failed, falling back to mock:', err);
    }

    // Mock signing fallback
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    const signedTx: SignedTransaction = {
      unsignedTxId: unsignedTx.id,
      chain: unsignedTx.chain,
      unsignedTx,
      signature: `mock_signature_${txHash}`,
      serialized: `mock_serialized_${txHash}`,
      txHash,
      signedAt: Date.now(),
    };

    // Store transaction record
    const txRecord: TransactionRecord = {
      id: unsignedTx.id,
      chain: unsignedTx.chain,
      walletId,
      txHash,
      from: unsignedTx.from,
      to: unsignedTx.to,
      amount: unsignedTx.amount,
      fee: unsignedTx.fee,
      status: 'signed',
      createdAt: unsignedTx.createdAt,
      signedAt: Date.now(),
    };

    this.transactions.push(txRecord);

    return { success: true, data: signedTx };
  }

  async broadcastTransaction(
    signedTx: SignedTransaction
  ): Promise<{ success: boolean; data?: string; error?: { message: string } }> {
    // In offline mode, broadcasting is not available
    return {
      success: false,
      error: { message: 'Broadcasting not available in offline mode' },
    };
  }

  async getHistory(walletId?: string): Promise<TransactionRecord[]> {
    if (walletId) {
      return this.transactions.filter((tx) => tx.walletId === walletId);
    }
    return this.transactions;
  }

  parseTransaction(chain: string, serialized: string): Partial<UnsignedTransaction> {
    // Mock parsing
    return {
      chain,
      from: 'parsed_from',
      to: 'parsed_to',
      amount: '0',
    };
  }

  estimateFee(chain: string): { success: boolean; data: string } {
    return { success: true, data: this.getDefaultFee(chain) };
  }
}

// Singleton service instance
const transactionService = new MockTransactionService();

/**
 * Sets up transaction IPC handlers
 */
export function setupTransactionIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'transaction:build',
    async (_, params: BuildTransactionParams, prerequisites: TransactionPrerequisites) => {
      return transactionService.buildTransaction(params, prerequisites);
    }
  );

  ipcMain.handle(
    'transaction:sign',
    async (_, walletId: string, unsignedTx: UnsignedTransaction) => {
      return transactionService.signTransaction(walletId, unsignedTx);
    }
  );

  ipcMain.handle('transaction:broadcast', async (_, signedTx: SignedTransaction) => {
    return transactionService.broadcastTransaction(signedTx);
  });

  ipcMain.handle('transaction:history', async (_, walletId?: string) => {
    const history = await transactionService.getHistory(walletId);
    return { success: true, data: history };
  });

  ipcMain.handle('transaction:parse', (_, chain: string, serialized: string) => {
    const parsed = transactionService.parseTransaction(chain, serialized);
    return { success: true, data: parsed };
  });

  ipcMain.handle('transaction:estimateFee', (_, chain: string) => {
    return transactionService.estimateFee(chain);
  });
}
