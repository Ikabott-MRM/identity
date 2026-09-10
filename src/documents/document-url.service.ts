import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export const EMISOR_ROLE = 'role:emisor';
export const VERIFIER_ROLE = 'role:verifier';

@Injectable()
export class DocumentUrlService {
  private readonly secret: string;
  private readonly ttlSec: number;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('documents.urlSigningSecret') ||
      'dev-only-document-url-signing-secret-change-me';
    this.ttlSec =
      this.configService.get<number>('documents.urlTtlSec') ?? 600;
    this.publicBaseUrl = (
      this.configService.get<string>('publicApiBaseUrl') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  buildPayload(documentId: string, exp: number, didOrRole: string): string {
    return `${documentId}.${exp}.${didOrRole}`;
  }

  sign(documentId: string, exp: number, didOrRole: string): string {
    const payload = this.buildPayload(documentId, exp, didOrRole);
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');
  }

  verify(
    documentId: string,
    exp: number | string,
    didOrRole: string,
    sig: string,
  ): boolean {
    const expNum = typeof exp === 'string' ? parseInt(exp, 10) : exp;
    if (!Number.isFinite(expNum) || !sig || !documentId || !didOrRole) {
      return false;
    }
    if (expNum * 1000 <= Date.now()) {
      return false;
    }
    const expected = this.sign(documentId, expNum, didOrRole);
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  assertValid(
    documentId: string,
    exp: number | string,
    didOrRole: string,
    sig: string,
  ): void {
    if (!this.verify(documentId, exp, didOrRole, sig)) {
      throw new UnauthorizedException('Invalid or expired document signature.');
    }
  }

  createAccessUrl(documentId: string, didOrRole: string, ttlSec?: number): string {
    const ttl = ttlSec ?? this.ttlSec;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const sig = this.sign(documentId, exp, didOrRole);
    const didEnc = encodeURIComponent(didOrRole);
    return `${this.publicBaseUrl}/documents/${encodeURIComponent(documentId)}?exp=${exp}&did=${didEnc}&sig=${sig}`;
  }

  /** Filename-only view of a stored multer path like documents/abc. */
  toFilenameOnly(documentUrl: string | null | undefined): string | null {
    if (!documentUrl) return null;
    const parts = documentUrl.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || null;
  }
}
