import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import { basename, join, normalize, resolve } from 'path';

export const PHOTO_HASH_ALG = 'sha-256';

export interface PhotoHashClaims {
  photoHash: string;
  photoHashAlg: typeof PHOTO_HASH_ALG;
  document_id: string;
}

/**
 * SHA-256 hex of raw file bytes under the Identity documents/ store.
 * Emisor-supplied hashes must never be trusted — call this on issue only.
 */
export function computePhotoHashFromDocumentUrl(
  documentUrl: string | null | undefined,
  documentsRoot = resolve(join(process.cwd(), 'documents')),
): string | null {
  if (!documentUrl) return null;
  const safeName = basename(documentUrl.replace(/\\/g, '/'));
  if (!safeName) return null;
  const filePath = normalize(join(documentsRoot, safeName));
  if (!filePath.startsWith(documentsRoot)) return null;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  const bytes = readFileSync(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

export function buildPhotoHashClaims(
  documentId: string | null | undefined,
  documentUrl: string | null | undefined,
  documentsRoot?: string,
): PhotoHashClaims | null {
  if (!documentId) return null;
  const photoHash = computePhotoHashFromDocumentUrl(documentUrl, documentsRoot);
  if (!photoHash) return null;
  return {
    photoHash,
    photoHashAlg: PHOTO_HASH_ALG,
    document_id: documentId,
  };
}

/** Strip any client-supplied photo claims, then embed Identity-computed ones. */
export function applyPhotoHashClaims(
  mappedData: Record<string, unknown>,
  claims: PhotoHashClaims | null,
): Record<string, unknown> {
  const next = { ...mappedData };
  delete next.photoHash;
  delete next.photoHashAlg;
  delete next.document_id;
  if (claims) {
    next.photoHash = claims.photoHash;
    next.photoHashAlg = claims.photoHashAlg;
    next.document_id = claims.document_id;
  }
  return next;
}
