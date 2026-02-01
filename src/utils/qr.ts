/**
 * QR Code utility functions
 * Handles QR generation and parsing for air-gap data transfer
 */

import QRCode from 'qrcode';
import type { Chain } from '@/types';
import { checksum } from './crypto';

/** Maximum data size for a single QR code (in characters) */
const MAX_QR_DATA_SIZE = 2000;

/** Air-gap payload structure */
export interface AirGapPayload {
  version: string;
  type: 'unsigned_tx' | 'signed_tx' | 'public_key' | 'address';
  chain: Chain;
  data: string;
  checksum: string;
  timestamp: number;
}

/** Animated QR frame for large data */
export interface AnimatedQRFrame {
  total: number;
  index: number;
  payload: string;
}

/**
 * Generates a QR code as data URL
 * @param data - Data to encode
 * @param options - QR code options
 * @returns Data URL of QR code image
 */
export async function generateQRCode(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'M',
  } = options || {};

  return QRCode.toDataURL(data, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Creates an air-gap payload
 * @param type - Payload type
 * @param chain - Target chain
 * @param data - Data object to encode
 * @returns Encoded payload string
 */
export function createAirGapPayload<T>(
  type: AirGapPayload['type'],
  chain: Chain,
  data: T
): string {
  const dataStr = JSON.stringify(data);
  const encodedData = Buffer.from(dataStr).toString('base64');

  const payload: AirGapPayload = {
    version: '1.0',
    type,
    chain,
    data: encodedData,
    checksum: checksum(encodedData),
    timestamp: Date.now(),
  };

  return JSON.stringify(payload);
}

/**
 * Parses an air-gap payload
 * @param payloadStr - Encoded payload string
 * @returns Parsed payload with decoded data
 */
export function parseAirGapPayload<T>(payloadStr: string): {
  payload: AirGapPayload;
  data: T;
} {
  const payload = JSON.parse(payloadStr) as AirGapPayload;

  // Verify checksum
  const calculatedChecksum = checksum(payload.data);
  if (calculatedChecksum !== payload.checksum) {
    throw new Error('Payload checksum verification failed');
  }

  // Decode data
  const dataStr = Buffer.from(payload.data, 'base64').toString('utf-8');
  const data = JSON.parse(dataStr) as T;

  return { payload, data };
}

/**
 * Splits large data into animated QR frames
 * @param data - Data to split
 * @returns Array of frame payloads
 */
export function createAnimatedQRFrames(data: string): AnimatedQRFrame[] {
  const frames: AnimatedQRFrame[] = [];
  const chunkSize = MAX_QR_DATA_SIZE - 50; // Reserve space for frame metadata

  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    frames.push({
      total: chunks.length,
      index: i,
      payload: chunks[i],
    });
  }

  return frames;
}

/**
 * Reconstructs data from animated QR frames
 * @param frames - Collected frames
 * @returns Reconstructed data
 */
export function reconstructFromFrames(frames: AnimatedQRFrame[]): string {
  // Sort by index
  const sorted = [...frames].sort((a, b) => a.index - b.index);

  // Verify completeness
  const total = sorted[0]?.total;
  if (!total || sorted.length !== total) {
    throw new Error(`Incomplete frames: got ${sorted.length}, expected ${total}`);
  }

  // Verify indices
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].index !== i) {
      throw new Error(`Missing frame at index ${i}`);
    }
  }

  // Reconstruct
  return sorted.map((f) => f.payload).join('');
}

/**
 * Generates QR codes for air-gap data transfer
 * Returns single QR or animated frames based on data size
 * @param type - Payload type
 * @param chain - Target chain
 * @param data - Data to encode
 * @returns QR code data URL(s)
 */
export async function generateAirGapQR<T>(
  type: AirGapPayload['type'],
  chain: Chain,
  data: T
): Promise<{ single: string } | { frames: string[]; frameInterval: number }> {
  const payloadStr = createAirGapPayload(type, chain, data);

  if (payloadStr.length <= MAX_QR_DATA_SIZE) {
    const qrDataUrl = await generateQRCode(payloadStr);
    return { single: qrDataUrl };
  }

  // Create animated frames
  const frames = createAnimatedQRFrames(payloadStr);
  const frameDataUrls: string[] = [];

  for (const frame of frames) {
    const frameStr = JSON.stringify(frame);
    const qrDataUrl = await generateQRCode(frameStr);
    frameDataUrls.push(qrDataUrl);
  }

  return {
    frames: frameDataUrls,
    frameInterval: 500, // 500ms per frame
  };
}

/**
 * Validates an air-gap payload string
 * @param payloadStr - Payload to validate
 * @returns Validation result
 */
export function validateAirGapPayload(payloadStr: string): {
  valid: boolean;
  error?: string;
  payload?: AirGapPayload;
} {
  try {
    const payload = JSON.parse(payloadStr) as AirGapPayload;

    // Check required fields
    if (!payload.version || !payload.type || !payload.chain || !payload.data) {
      return { valid: false, error: 'Missing required fields' };
    }

    // Verify checksum
    const calculatedChecksum = checksum(payload.data);
    if (calculatedChecksum !== payload.checksum) {
      return { valid: false, error: 'Checksum mismatch' };
    }

    // Verify type
    const validTypes = ['unsigned_tx', 'signed_tx', 'public_key', 'address'];
    if (!validTypes.includes(payload.type)) {
      return { valid: false, error: 'Invalid payload type' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }
}
