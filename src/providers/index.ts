/**
 * Key providers module exports
 */

export * from './key-provider.interface';
export { LocalKeyProvider } from './local-key.provider';
export { ExternalKeyProvider } from './external-key.provider';

import type { KeyProviderType } from '@/types';
import type { IKeyProvider } from './key-provider.interface';
import { LocalKeyProvider } from './local-key.provider';
import { ExternalKeyProvider } from './external-key.provider';

/**
 * Creates a key provider based on type
 * @param type - Provider type
 * @returns Key provider instance
 */
export function createKeyProvider(type: KeyProviderType): IKeyProvider {
  switch (type) {
    case 'local':
      return new LocalKeyProvider();
    case 'external':
      return new ExternalKeyProvider();
    default:
      throw new Error(`Unknown key provider type: ${type}`);
  }
}
