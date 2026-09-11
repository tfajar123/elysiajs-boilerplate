import { describe, expect, it } from 'bun:test';

// Fallback env values so the suite is hermetic even without a .env file.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.ACCESS_TOKEN_EXPIRES_IN ??= '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d';

const {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import('./jwt');

describe('createAccessToken', () => {
  it('returns a signed token with a jti and expiry', async () => {
    const { token, jti, expiresAt } = await createAccessToken('user-1');

    expect(jti).toBeTruthy();
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const { payload } = await verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.jti).toBe(jti);
    expect(payload.type).toBe('access');
  });
});

describe('createRefreshToken', () => {
  it('returns a signed refresh token with a jti and expiry', async () => {
    const { token, jti, expiresAt } = await createRefreshToken('user-1');

    expect(jti).toBeTruthy();
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const { payload } = await verifyRefreshToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.jti).toBe(jti);
    expect(payload.type).toBe('refresh');
  });
});

describe('token verification', () => {
  it('rejects an access token signed with the refresh secret', async () => {
    const { token } = await createRefreshToken('user-1');

    expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a refresh token signed with the access secret', async () => {
    const { token } = await createAccessToken('user-1');

    expect(verifyRefreshToken(token)).rejects.toThrow();
  });
});
