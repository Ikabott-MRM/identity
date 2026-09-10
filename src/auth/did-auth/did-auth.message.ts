export const DID_AUTH_MESSAGE_PREFIX = 'SSI-DID-AUTH';
export const DID_AUTH_MESSAGE_VERSION = 'v1';

/**
 * Canonical challenge message bytes that the citizen signs with Ed25519.
 * Must match exactly on client and server.
 */
export function buildDidAuthMessage(
  did: string,
  nonce: string,
  expiresAt: string,
): string {
  return [
    DID_AUTH_MESSAGE_PREFIX,
    DID_AUTH_MESSAGE_VERSION,
    did,
    nonce,
    expiresAt,
  ].join('\n');
}
