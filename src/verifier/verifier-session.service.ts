import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { VERIFIER_ROLE } from '../documents/document-url.service';

export { VERIFIER_ROLE };
export const VERIFIER_SCOPE_DOCUMENTS_READ = 'documents:read';

export interface VerifierSessionTokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface VerifierJwtUser {
  role: 'verifier';
  scope: string[];
  sub: string;
}

export interface VerifierCompanyCodeStatus {
  configured: boolean;
  updatedAt: string | null;
  /** Decrypted plaintext when encrypted_code is present; null if only legacy hash. */
  code: string | null;
}

/**
 * Encrypts/decrypts the viewable company code.
 * Secret source: DOCUMENT_URL_SIGNING_SECRET → config documents.urlSigningSecret
 * (SHA-256 derived to 32-byte AES key). Format: v1:iv:tag:ciphertext (base64 parts).
 */
@Injectable()
export class VerifierSessionService {
  private readonly logger = new Logger(VerifierSessionService.name);
  private readonly jwtSecret: string;
  private readonly jwtTtlSec: number;
  private readonly audience: string;
  private readonly issuer: string;
  private readonly bcryptRounds = 10;
  private readonly codeEncryptionKey: Buffer;

  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('verifierSession.jwtSecret') ||
      'dev-only-verifier-session-jwt-secret-change-me';
    this.jwtTtlSec =
      this.configService.get<number>('verifierSession.jwtTtlSec') ?? 43200;
    this.audience =
      this.configService.get<string>('verifierSession.audience') ??
      'ssi-verifier';
    this.issuer =
      this.configService.get<string>('publicApiBaseUrl') ??
      'http://localhost:3000';

    const encSecret =
      this.configService.get<string>('documents.urlSigningSecret') ||
      'dev-only-document-url-signing-secret-change-me';
    this.codeEncryptionKey = createHash('sha256').update(encSecret).digest();
  }

  /** AES-256-GCM → `v1:<iv_b64>:<tag_b64>:<ct_b64>` */
  encryptCompanyCode(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.codeEncryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decryptCompanyCode(payload: string | null | undefined): string | null {
    if (!payload || typeof payload !== 'string') {
      return null;
    }
    try {
      const parts = payload.split(':');
      if (parts.length !== 4 || parts[0] !== 'v1') {
        return null;
      }
      const [, ivB64, tagB64, ctB64] = parts;
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const ciphertext = Buffer.from(ctB64, 'base64');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.codeEncryptionKey,
        iv,
      );
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plain.toString('utf8');
    } catch (err) {
      this.logger.warn(
        `Failed to decrypt company code blob: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async getStatus(): Promise<VerifierCompanyCodeStatus> {
    const row = await this.knex('verifier_company_settings')
      .orderBy('id', 'asc')
      .first();
    if (!row?.hashed_code) {
      return { configured: false, updatedAt: null, code: null };
    }
    const updatedAt = row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null;
    const code = this.decryptCompanyCode(row.encrypted_code);
    return { configured: true, updatedAt, code };
  }

  async setCompanyCode(plainCode: string): Promise<{ updatedAt: string }> {
    const trimmed = (plainCode || '').trim();
    if (trimmed.length < 4) {
      throw new BadRequestException(
        'Company code must be at least 4 characters.',
      );
    }

    const hashed = await bcrypt.hash(trimmed, this.bcryptRounds);
    const encrypted = this.encryptCompanyCode(trimmed);
    const existing = await this.knex('verifier_company_settings')
      .orderBy('id', 'asc')
      .first();

    if (existing) {
      await this.knex('verifier_company_settings')
        .where({ id: existing.id })
        .update({
          hashed_code: hashed,
          encrypted_code: encrypted,
          updated_at: this.knex.fn.now(),
        });
    } else {
      await this.knex('verifier_company_settings').insert({
        hashed_code: hashed,
        encrypted_code: encrypted,
      });
    }

    const status = await this.getStatus();
    this.logger.log('Verifier company code updated.');
    return { updatedAt: status.updatedAt || new Date().toISOString() };
  }

  async createSession(plainCode: string): Promise<VerifierSessionTokenResult> {
    const trimmed = (plainCode || '').trim();
    if (!trimmed) {
      throw new UnauthorizedException('Invalid company code.');
    }

    const row = await this.knex('verifier_company_settings')
      .orderBy('id', 'asc')
      .first();

    if (!row?.hashed_code) {
      throw new UnauthorizedException(
        'Verifier company code is not configured.',
      );
    }

    const matches = await bcrypt.compare(trimmed, row.hashed_code);
    if (!matches) {
      throw new UnauthorizedException('Invalid company code.');
    }

    const expiresIn = this.jwtTtlSec;
    const accessToken = jwt.sign(
      {
        role: 'verifier',
        scope: [VERIFIER_SCOPE_DOCUMENTS_READ],
      },
      this.jwtSecret,
      {
        algorithm: 'HS256',
        issuer: this.issuer,
        subject: VERIFIER_ROLE,
        audience: this.audience,
        expiresIn,
      },
    );

    return { accessToken, expiresIn, tokenType: 'Bearer' };
  }

  verifyAccessToken(token: string): VerifierJwtUser {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
      }) as jwt.JwtPayload;

      if (payload.role !== 'verifier' && payload.sub !== VERIFIER_ROLE) {
        throw new UnauthorizedException('Not a verifier session token.');
      }

      const scope = Array.isArray(payload.scope)
        ? (payload.scope as string[])
        : [];

      return {
        role: 'verifier',
        scope,
        sub: (payload.sub as string) || VERIFIER_ROLE,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired verifier session.');
    }
  }

  /**
   * Soft Bearer parse: returns null when header missing or token is not a
   * valid verifier session (so callers can fall through to DID JWT / API key).
   */
  tryVerifyBearer(authorizationHeader?: string): VerifierJwtUser | null {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }
    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token) return null;
    try {
      return this.verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  assertDocumentsRead(user: VerifierJwtUser): void {
    if (!user.scope.includes(VERIFIER_SCOPE_DOCUMENTS_READ)) {
      throw new UnauthorizedException(
        'Verifier session missing documents:read scope.',
      );
    }
  }
}
