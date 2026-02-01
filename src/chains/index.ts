/**
 * Chain services registry and factory
 */

import type { Chain } from '@/types';
import type { IChainService, ChainServiceRegistry } from './types';
import { BtcService } from './btc';
import { EthService } from './eth';
import { XrpService } from './xrp';
import { TronService } from './tron';

export * from './types';
export { BtcService } from './btc';
export { EthService } from './eth';
export { XrpService } from './xrp';
export { TronService } from './tron';

/** Singleton instances of chain services */
const chainServices: ChainServiceRegistry = {
  BTC: new BtcService(),
  ETH: new EthService(),
  XRP: new XrpService(),
  TRON: new TronService(),
};

/**
 * Gets the chain service for a specific chain
 * @param chain - Target chain
 * @returns Chain service instance
 */
export function getChainService(chain: Chain): IChainService {
  const service = chainServices[chain];
  if (!service) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return service;
}

/**
 * Gets all available chain services
 * @returns Registry of all chain services
 */
export function getAllChainServices(): ChainServiceRegistry {
  return chainServices;
}

/**
 * Validates an address for any supported chain
 * @param chain - Target chain
 * @param address - Address to validate
 * @returns true if address is valid for the chain
 */
export function validateAddress(chain: Chain, address: string): boolean {
  return getChainService(chain).validateAddress(address);
}
