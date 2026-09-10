import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class VerifierSessionService {
  private readonly logger = new Logger(VerifierSessionService.name);
  private readonly jwtSecret: string;
  private readonly jwtTtlSec: number;
  private readonly audience: string;
  private readonly issuer: string;
  private readonly bcryptRounds = 10;

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
  }

  async getStatus(): Promise<{ configured: boolean; updatedAt: string | null }> {
    const row = await this.knex('verifier_company_settings')
      .orderBy('id', 'asc')
      .first();
    if (!row?.hashed_code) {
      return { configured: false, updatedAt: null };
    }
    const updatedAt = row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null;
    return { configured: true, updatedAt };
  }

  async setCompanyCode(plainCode: string): Promise<{ updatedAt: string }> {
    const trimmed = (plainCode || '').trim();
    if (trimmed.length < 4) {
      throw new BadRequestException(
        'Company code must be at least 4 characters.',
      );
    }

    const hashed = await bcrypt.hash(trimmed, this.bcryptRounds);
    const existing = await this.knex('verifier_company_settings')
      .orderBy('id', 'asc')
      .first();

    if (existing) {
      await this.knex('verifier_company_settings')
        .where({ id: existing.id })
        .update({
          hashed_code: hashed,
          updated_at: this.knex.fn.now(),
        });
    } else {
      await this.knex('verifier_company_settings').insert({
        hashed_code: hashed,
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
