import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Derives a stable bytes32 key from a DID URI using keccak256.
 * This matches the contract's expectation for didKey.
 */
export function deriveDidKey(didUri: string): string {
  return keccak256(toUtf8Bytes(didUri));
}

/**
 * Validates that a CID string is non-empty.
 * Basic validation - IPFS CIDs can be various formats.
 */
export function isValidCid(cid: string): boolean {
  return typeof cid === 'string' && cid.trim().length > 0;
}

/**
 * Redacts sensitive information from strings for logging.
 * Never log private keys, full CIDs in production, etc.
 */
export function redactForLogging(value: string, maxLength = 20): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.substring(0, maxLength)}...`;
}

/**
 * Extracts hostname from RPC URL for logging (without exposing full URL).
 */
export function extractRpcHost(rpcUrl?: string): string {
  if (!rpcUrl) return 'unknown';
  try {
    const url = new URL(rpcUrl);
    return url.hostname;
  } catch {
    return redactForLogging(rpcUrl, 30);
  }
}


