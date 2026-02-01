/**
 * Common types used across the application
 */

/** Supported blockchain chains */
export type Chain = 'BTC' | 'ETH' | 'XRP' | 'TRON';

/** Wallet temperature classification */
export type WalletType = 'cold' | 'warm';

/** Application operating mode */
export type AppMode = 'offline' | 'online';

/** Key provider type */
export type KeyProviderType = 'local' | 'external';

/** Result type for operations that can fail */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/** Success result helper */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** Failure result helper */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/** Application configuration */
export interface AppConfig {
  mode: AppMode;
  keyProviderType: KeyProviderType;
  encryptionEnabled: boolean;
  autoLockTimeout: number;
  defaultChain: Chain;
}

/** Derivation path configuration per chain */
export const DERIVATION_PATHS: Record<Chain, Record<string, string>> = {
  BTC: {
    legacy: "m/44'/0'/0'/0",
    segwit: "m/49'/0'/0'/0",
    nativeSegwit: "m/84'/0'/0'/0",
    taproot: "m/86'/0'/0'/0",
  },
  ETH: {
    default: "m/44'/60'/0'/0",
  },
  XRP: {
    default: "m/44'/144'/0'/0",
  },
  TRON: {
    default: "m/44'/195'/0'/0",
  },
};

/** Chain display names */
export const CHAIN_NAMES: Record<Chain, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  XRP: 'XRP Ledger',
  TRON: 'TRON',
};

/** Chain symbols */
export const CHAIN_SYMBOLS: Record<Chain, string> = {
  BTC: 'BTC',
  ETH: 'ETH',
  XRP: 'XRP',
  TRON: 'TRX',
};

/** Decimal places per chain */
export const CHAIN_DECIMALS: Record<Chain, number> = {
  BTC: 8,
  ETH: 18,
  XRP: 6,
  TRON: 6,
};
