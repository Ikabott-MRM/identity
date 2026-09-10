import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DidJwtAuthGuard } from './did-jwt-auth.guard';

describe('DidJwtAuthGuard', () => {
  const makeContext = (didParam: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params: { did: didParam } }),
      }),
    }) as unknown as ExecutionContext;

  it('rejects when JWT did does not match path did', () => {
    const config = {
      get: () => true,
    } as unknown as ConfigService;
    const guard = new DidJwtAuthGuard(config);
    expect(() =>
      guard.handleRequest(
        null,
        { did: 'did:dht:a', scope: [] },
        null,
        makeContext('did:dht:b'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows matching JWT did and path did', () => {
    const config = {
      get: () => true,
    } as unknown as ConfigService;
    const guard = new DidJwtAuthGuard(config);
    const user = guard.handleRequest(
      null,
      { did: 'did:dht:a', scope: ['requests:own'] },
      null,
      makeContext('did:dht:a'),
    );
    expect(user).toEqual({ did: 'did:dht:a', scope: ['requests:own'] });
  });
});
