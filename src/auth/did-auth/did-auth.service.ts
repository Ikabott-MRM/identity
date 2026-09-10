import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Convert } from '@web5/common';
import { Ed25519, Jwk } from '@web5/crypto';
import { DidDhtDocument, DidDhtUtils, DidDocument, DidVerificationMethod } from '@web5/dids';
import { randomBytes, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { buildDidAuthMessage } from './did-auth.message';

export interface DidAuthChallengeResult {
  challengeId: string;
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface DidAuthTokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

@Injectable()
export class DidAuthService {
  private readonly logger = new Logger(DidAuthService.name);
  private readonly gatewayUri: string;
  private readonly jwtSecret: string;
  private readonly jwtTtlSec: number;
  private readonly challengeTtlSec: number;
  private readonly audience: string;
  private readonly issuer: string;

  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private readonly configService: ConfigService,
  ) {
    this.gatewayUri = this.configService.get<string>('ssi.gatewayUri');
    this.jwtSecret = this.configService.get<string>('didAuth.jwtSecret');
    this.jwtTtlSec = this.configService.get<number>('didAuth.jwtTtlSec') ?? 1800;
    this.challengeTtlSec =
      this.configService.get<number>('didAuth.challengeTtlSec') ?? 300;
    this.audience =
      this.configService.get<string>('didAuth.audience') ?? 'ssi-citizen';
    this.issuer =
      this.configService.get<string>('publicApiBaseUrl') ??
      'http://localhost:3000';
  }

  async createChallenge(did: string): Promise<DidAuthChallengeResult> {
    if (!did?.startsWith('did:')) {
      throw new BadRequestException('Invalid DID.');
    }

    const challengeId = randomUUID();
    const nonce = Convert.uint8Array(randomBytes(32)).toBase64Url();
    const expiresAtDate = new Date(Date.now() + this.challengeTtlSec * 1000);
    const expiresAt = expiresAtDate.toISOString();
    const message = buildDidAuthMessage(did, nonce, expiresAt);

    await this.knex('did_auth_challenges').insert({
      id: challengeId,
      did,
      nonce,
      message,
      expires_at: expiresAtDate,
      used_at: null,
    });

    return { challengeId, nonce, expiresAt, message };
  }

  async exchangeToken(params: {
    did: string;
    challengeId: string;
    signature: string;
  }): Promise<DidAuthTokenResult> {
    const { did, challengeId, signature } = params;

    const challenge = await this.knex('did_auth_challenges')
      .where({ id: challengeId })
      .first();

    if (!challenge) {
      throw new UnauthorizedException('Challenge not found.');
    }
    if (challenge.did !== did) {
      throw new UnauthorizedException('Challenge DID mismatch.');
    }
    if (challenge.used_at) {
      throw new UnauthorizedException('Challenge already used.');
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException('Challenge expired.');
    }

    const publicKeyJwk = await this.resolveAuthenticationPublicKey(did);

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = Convert.base64Url(signature).toUint8Array();
    } catch {
      throw new UnauthorizedException('Invalid signature encoding.');
    }

    const messageBytes = new TextEncoder().encode(challenge.message);
    let valid = false;
    try {
      valid = await Ed25519.verify({
        key: publicKeyJwk,
        signature: signatureBytes,
        data: messageBytes,
      });
    } catch (err) {
      this.logger.warn(`Ed25519 verify failed for ${did}: ${err.message}`);
      throw new UnauthorizedException('Signature verification failed.');
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid signature.');
    }

    await this.knex('did_auth_challenges')
      .where({ id: challengeId })
      .update({ used_at: this.knex.fn.now() });

    const expiresIn = this.jwtTtlSec;
    const accessToken = jwt.sign(
      {
        scope: ['requests:own', 'documents:own'],
      },
      this.jwtSecret,
      {
        algorithm: 'HS256',
        issuer: this.issuer,
        subject: did,
        audience: this.audience,
        expiresIn,
      },
    );

    return { accessToken, expiresIn, tokenType: 'Bearer' };
  }

  verifyAccessToken(token: string): { did: string; scope: string[] } {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject.');
      }

      const scope = Array.isArray(payload.scope)
        ? (payload.scope as string[])
        : [];

      return { did: payload.sub, scope };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired DID token.');
    }
  }


  /**
   * Prefer DHT document resolution; for did:dht fall back to the identity key
   * embedded in the DID method-id when the Pkarr gateway has no record
   * (common with local dwn-server relays that do not persist pkarr puts).
   */
  private async resolveAuthenticationPublicKey(did: string): Promise<Jwk> {
    try {
      const didDocument = await this.resolveDidDocument(did);
      const publicKeyJwk = this.extractAuthenticationPublicKey(didDocument);
      if (publicKeyJwk) {
        return publicKeyJwk;
      }
      this.logger.warn(
        `DID ${did} resolved but had no usable auth key; trying identity-key fallback`,
      );
    } catch (err) {
      this.logger.warn(
        `DHT resolve failed for ${did}: ${err.message}; trying identity-key fallback`,
      );
    }

    if (did.startsWith('did:dht:')) {
      return this.identityKeyJwkFromDidDht(did);
    }

    throw new UnauthorizedException('DID could not be resolved.');
  }

  private identityKeyJwkFromDidDht(didUri: string): Jwk {
    try {
      const publicKeyBytes = DidDhtUtils.identifierToIdentityKeyBytes({
        didUri,
      });
      const x = Convert.uint8Array(publicKeyBytes).toBase64Url();
      return { kty: 'OKP', crv: 'Ed25519', x } as Jwk;
    } catch (err) {
      this.logger.warn(
        `identity-key fallback failed for ${didUri}: ${err.message}`,
      );
      throw new UnauthorizedException('DID could not be resolved.');
    }
  }

  private async resolveDidDocument(didUri: string): Promise<DidDocument> {
    try {
      const resolution = await DidDhtDocument.get({
        didUri,
        gatewayUri: this.gatewayUri,
      });
      if (!resolution?.didDocument) {
        throw new UnauthorizedException('DID could not be resolved.');
      }
      return resolution.didDocument;
    } catch (err) {
      this.logger.warn(`DID resolve failed for ${didUri}: ${err.message}`);
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('DID could not be resolved.');
    }
  }

  private extractAuthenticationPublicKey(
    didDocument: DidDocument,
  ): Jwk | null {
    const methods = didDocument.verificationMethod || [];
    if (!methods.length) return null;

    const pickRef = (refs?: (string | DidVerificationMethod)[]) => {
      if (!refs?.length) return null;
      const first = refs[0];
      return typeof first === 'string' ? first : first.id;
    };

    const preferredId =
      pickRef(didDocument.authentication as (string | DidVerificationMethod)[]) ||
      pickRef(didDocument.assertionMethod as (string | DidVerificationMethod)[]);

    let method: DidVerificationMethod | undefined;
    if (preferredId) {
      method = methods.find(
        (vm) =>
          vm.id === preferredId ||
          preferredId.endsWith(vm.id) ||
          vm.id.endsWith(preferredId.replace(/^.*#/, '#')) ||
          (preferredId.includes('#') &&
            vm.id.endsWith('#' + preferredId.split('#').pop())),
      );
    }
    if (!method) {
      method = methods[0];
    }

    const jwk = method?.publicKeyJwk as Jwk | undefined;
    if (!jwk || jwk.crv !== 'Ed25519') {
      return null;
    }
    return jwk;
  }
}
