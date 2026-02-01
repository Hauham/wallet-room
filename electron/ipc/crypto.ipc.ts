/**
 * Crypto/QR IPC Handlers
 * Handles QR code and cryptographic IPC calls from renderer
 */

import type { IpcMain } from 'electron';

interface QRData {
  type: 'qr';
  data: string;
  frames?: number;
}

interface AirGapPayload {
  version: string;
  type: 'unsigned_tx' | 'signed_tx' | 'public_key' | 'address';
  chain: string;
  data: string;
  checksum: string;
  timestamp: number;
}

// Simple checksum function for mock
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Sets up crypto/QR IPC handlers
 */
export function setupCryptoIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'qr:exportForSigning',
    async (_, walletId: string, unsignedTx: unknown) => {
      try {
        const txData = JSON.stringify({
          walletId,
          transaction: unsignedTx,
        });

        const encodedData = Buffer.from(txData).toString('base64');

        const payload: AirGapPayload = {
          version: '1.0',
          type: 'unsigned_tx',
          chain: (unsignedTx as { chain: string }).chain,
          data: encodedData,
          checksum: calculateChecksum(encodedData),
          timestamp: Date.now(),
        };

        const qrData: QRData = {
          type: 'qr',
          data: JSON.stringify(payload),
        };

        return { success: true, data: qrData };
      } catch (error) {
        return {
          success: false,
          error: { message: error instanceof Error ? error.message : 'Export failed' },
        };
      }
    }
  );

  ipcMain.handle('qr:importSignedTransaction', async (_, data: QRData) => {
    try {
      const payload = JSON.parse(data.data) as AirGapPayload;

      // Verify checksum
      const calculatedChecksum = calculateChecksum(payload.data);
      if (calculatedChecksum !== payload.checksum) {
        return {
          success: false,
          error: { message: 'Invalid checksum - data may be corrupted' },
        };
      }

      if (payload.type !== 'signed_tx') {
        return {
          success: false,
          error: { message: 'Invalid QR type - expected signed transaction' },
        };
      }

      const signedTx = JSON.parse(Buffer.from(payload.data, 'base64').toString());

      return { success: true, data: signedTx };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Import failed' },
      };
    }
  });

  ipcMain.handle('qr:exportPublicKey', async (_, walletId: string) => {
    try {
      // Mock wallet data
      const walletData = {
        publicKey: `mock_pubkey_${walletId}`,
        address: `mock_address_${walletId}`,
        derivationPath: "m/44'/0'/0'/0/0",
        chain: 'BTC',
      };

      const encodedData = Buffer.from(JSON.stringify(walletData)).toString('base64');

      const payload: AirGapPayload = {
        version: '1.0',
        type: 'public_key',
        chain: walletData.chain,
        data: encodedData,
        checksum: calculateChecksum(encodedData),
        timestamp: Date.now(),
      };

      const qrData: QRData = {
        type: 'qr',
        data: JSON.stringify(payload),
      };

      return { success: true, data: qrData };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Export failed' },
      };
    }
  });

  ipcMain.handle('qr:importPublicKey', async (_, qrDataString: string) => {
    try {
      const payload = JSON.parse(qrDataString) as AirGapPayload;

      // Verify checksum
      const calculatedChecksum = calculateChecksum(payload.data);
      if (calculatedChecksum !== payload.checksum) {
        return {
          success: false,
          error: { message: 'Invalid checksum - data may be corrupted' },
        };
      }

      if (payload.type !== 'public_key' && payload.type !== 'address') {
        return {
          success: false,
          error: { message: 'Invalid QR type - expected public key or address' },
        };
      }

      const walletData = JSON.parse(Buffer.from(payload.data, 'base64').toString());

      // Create watch-only wallet
      const wallet = {
        id: `wallet_${Date.now()}`,
        chain: payload.chain,
        type: 'cold',
        address: walletData.address,
        publicKey: walletData.publicKey,
        derivationPath: walletData.derivationPath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
      };

      return { success: true, data: wallet };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Import failed' },
      };
    }
  });
}
