/**
 * XRP Ledger utility functions
 */

import { isValidClassicAddress, isValidXAddress } from 'xrpl';

/**
 * Validates an XRP address (classic or X-address)
 * @param address - Address to validate
 * @returns true if valid
 */
export function isValidXrpAddress(address: string): boolean {
  return isValidClassicAddress(address) || isValidXAddress(address);
}

/**
 * Converts drops to XRP string
 * @param drops - Amount in drops
 * @returns XRP amount as string
 */
export function dropsToXrp(drops: string | number | bigint): string {
  const dropsNum = BigInt(drops);
  const xrp = Number(dropsNum) / 1000000;
  return xrp.toFixed(6);
}

/**
 * Converts XRP to drops
 * @param xrp - Amount in XRP
 * @returns Drops amount as string
 */
export function xrpToDrops(xrp: string | number): string {
  const amount = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return Math.round(amount * 1000000).toString();
}

/**
 * Standard XRP transaction fee in drops
 */
export const STANDARD_FEE_DROPS = '12';

/**
 * Account reserve in drops (10 XRP)
 */
export const ACCOUNT_RESERVE_DROPS = '10000000';

/**
 * Owner reserve per object in drops (2 XRP)
 */
export const OWNER_RESERVE_DROPS = '2000000';
