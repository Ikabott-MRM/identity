import { buildDidAuthMessage } from './did-auth.message';

describe('buildDidAuthMessage', () => {
  it('canonicalizes the challenge message exactly', () => {
    const did = 'did:dht:abc';
    const nonce = 'nonce-value';
    const expiresAt = '2026-09-07T22:00:00.000Z';
    expect(buildDidAuthMessage(did, nonce, expiresAt)).toBe(
      `SSI-DID-AUTH\nv1\n${did}\n${nonce}\n${expiresAt}`,
    );
  });
});
