import { describe, expect, it, mock } from 'bun:test';
import Elysia from 'elysia';

// Fallback env values so the suite is hermetic even without a .env file.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.ACCESS_TOKEN_EXPIRES_IN ??= '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d';

import { createFakeRedis, fakeRedisStore } from '../test/fake-redis';

// Mock the raw Redis connection; middleware + jwt utils stay REAL.
mock.module('../config/redis', () => ({ redis: createFakeRedis() }));

const { authMiddleware } = await import('./auth.middleware');
const { createAccessToken } = await import('../utils/jwt');
const { SignJWT } = await import('jose');

const callProtected = (headers: Record<string, string>) => {
  const app = new Elysia()
    .use(authMiddleware)
    .get('/protected', ({ userId }) => ({ userId }));

  return app.handle(
    new Request('http://localhost/protected', { headers }),
  );
};

describe('authMiddleware', () => {
  it('rejects when the authorization header is missing', async () => {
    const res = await callProtected({});

    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Authorization header required');
  });

  it('rejects a malformed authorization header', async () => {
    const res = await callProtected({ authorization: 'Token abc' });

    expect(await res.text()).toBe('Invalid authorization header');
  });

  it('rejects an invalid token', async () => {
    const res = await callProtected({ authorization: 'Bearer not-a-jwt' });

    expect(await res.text()).toBe('Invalid token');
  });

  it('rejects a revoked (blacklisted) token', async () => {
    const { token, jti } = await createAccessToken('user-1');
    fakeRedisStore.set(`blacklist:${jti}`, { value: '1', expiresAt: null });

    const res = await callProtected({ authorization: `Bearer ${token}` });

    expect(await res.text()).toBe('Invalid token');
  });

  it('rejects a token without a jti', async () => {
    const secret = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET as string,
    );
    const token = await new SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    const res = await callProtected({ authorization: `Bearer ${token}` });

    expect(await res.text()).toBe('Invalid token');
  });

  it('exposes userId for a valid token', async () => {
    const { token } = await createAccessToken('user-1');

    const res = await callProtected({ authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'user-1' });
  });
});
