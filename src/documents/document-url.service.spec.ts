import { DocumentUrlService, EMISOR_ROLE } from './document-url.service';
import { ConfigService } from '@nestjs/config';

describe('DocumentUrlService', () => {
  let service: DocumentUrlService;

  beforeEach(() => {
    const config = {
      get: (key: string) => {
        const map: Record<string, unknown> = {
          'documents.urlSigningSecret': 'test-signing-secret',
          'documents.urlTtlSec': 600,
          publicApiBaseUrl: 'https://example.test',
        };
        return map[key];
      },
    } as ConfigService;
    service = new DocumentUrlService(config);
  });

  it('signs and verifies HMAC payloads', () => {
    const documentId = 'doc-1';
    const exp = Math.floor(Date.now() / 1000) + 300;
    const did = 'did:dht:subject';
    const sig = service.sign(documentId, exp, did);
    expect(service.verify(documentId, exp, did, sig)).toBe(true);
    expect(service.verify(documentId, exp, 'did:dht:other', sig)).toBe(false);
    expect(service.verify(documentId, exp - 1000, did, sig)).toBe(false);
  });

  it('builds absolute access URLs', () => {
    const url = service.createAccessUrl('doc-2', EMISOR_ROLE, 60);
    expect(url.startsWith('https://example.test/documents/doc-2?')).toBe(true);
    expect(url).toContain('did=role%3Aemisor');
    expect(url).toContain('sig=');
  });

  it('extracts filename-only paths', () => {
    expect(service.toFilenameOnly('documents/abc123')).toBe('abc123');
    expect(service.toFilenameOnly(null)).toBeNull();
  });
});
