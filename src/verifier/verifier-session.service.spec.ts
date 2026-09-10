import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { VerifierSessionService } from './verifier-session.service';

describe('VerifierSessionService', () => {
  let service: VerifierSessionService;
  let knexMock: any;
  let rows: any[];

  beforeEach(() => {
    rows = [];
    const queryBuilder: any = {
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(async () => rows[0] || null),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockImplementation(async (data) => {
        if (rows[0]) Object.assign(rows[0], data);
        return 1;
      }),
      insert: jest.fn().mockImplementation(async (data) => {
        rows.push({ id: 1, ...data, updated_at: new Date() });
        return [1];
      }),
    };
    knexMock = Object.assign(
      jest.fn(() => queryBuilder),
      {
        fn: { now: jest.fn(() => new Date()) },
      },
    );

    const config = {
      get: (key: string) => {
        const map: Record<string, unknown> = {
          'verifierSession.jwtSecret': 'test-verifier-secret',
          'verifierSession.jwtTtlSec': 3600,
          'verifierSession.audience': 'ssi-verifier',
          publicApiBaseUrl: 'https://example.test',
        };
        return map[key];
      },
    } as ConfigService;

    service = new VerifierSessionService(knexMock, config);
  });

  it('rejects session when code is not configured', async () => {
    await expect(service.createSession('any-code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects session when code does not match', async () => {
    rows.push({
      id: 1,
      hashed_code: await bcrypt.hash('correct-code', 4),
      updated_at: new Date(),
    });
    await expect(service.createSession('wrong-code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts matching code and issues a verifiable JWT', async () => {
    rows.push({
      id: 1,
      hashed_code: await bcrypt.hash('correct-code', 4),
      updated_at: new Date(),
    });
    const result = await service.createSession('correct-code');
    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresIn).toBe(3600);
    expect(result.accessToken).toBeTruthy();

    const user = service.verifyAccessToken(result.accessToken);
    expect(user.role).toBe('verifier');
    expect(user.scope).toContain('documents:read');
  });

  it('setCompanyCode stores hash only and status hides plaintext', async () => {
    await service.setCompanyCode('pilot-secret');
    expect(rows[0].hashed_code).toBeTruthy();
    expect(rows[0].hashed_code).not.toContain('pilot-secret');
    const status = await service.getStatus();
    expect(status.configured).toBe(true);
    expect(status.updatedAt).toBeTruthy();
  });
});
