import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import {
  applyPhotoHashClaims,
  buildPhotoHashClaims,
  computePhotoHashFromDocumentUrl,
  PHOTO_HASH_ALG,
} from './photo-hash';

describe('photo-hash helpers', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'photo-hash-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('computes sha-256 hex of raw file bytes', () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    writeFileSync(join(dir, 'doc-abc'), bytes);
    const expected = createHash('sha256').update(bytes).digest('hex');
    expect(computePhotoHashFromDocumentUrl('documents/doc-abc', dir)).toBe(
      expected,
    );
  });

  it('builds claims and strips client-supplied photo fields', () => {
    const bytes = Buffer.from('pilot-photo');
    writeFileSync(join(dir, 'f1'), bytes);
    const claims = buildPhotoHashClaims('uuid-1', 'documents/f1', dir);
    expect(claims).toEqual({
      photoHash: createHash('sha256').update(bytes).digest('hex'),
      photoHashAlg: PHOTO_HASH_ALG,
      document_id: 'uuid-1',
    });

    const mapped = applyPhotoHashClaims(
      {
        firstname: 'Ada',
        photoHash: 'forged-by-emisor',
        photoHashAlg: 'md5',
        document_id: 'evil',
      },
      claims,
    );
    expect(mapped.photoHash).toBe(claims!.photoHash);
    expect(mapped.photoHashAlg).toBe('sha-256');
    expect(mapped.document_id).toBe('uuid-1');
    expect(mapped.firstname).toBe('Ada');
  });

  it('returns null when file missing', () => {
    expect(buildPhotoHashClaims('id', 'documents/missing', dir)).toBeNull();
  });
});
