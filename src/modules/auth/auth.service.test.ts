import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Fallback env values so the suite is hermetic even without a .env file.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.ACCESS_TOKEN_EXPIRES_IN ??= '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d';

import {
  createFakeRedis,
  fakeRedisStore,
  resetFakeRedis,
} from '../../test/fake-redis';

// Mock infrastructure boundaries: repository (DB) and the raw Redis connection.
// auth.service, utils/jwt, utils/password and utils/redis all stay REAL.
const findUserByEmail = mock(async (_email: string): Promise<any> => undefined);
const findUserById = mock(async (_id: string): Promise<any> => undefined);
const createUser = mock(
  async (
    _name: string,
    _email: string,
    _password: string,
  ): Promise<any> => undefined,
);

mock.module('./auth.repository', () => ({
  authRepository: { findUserByEmail, findUserById, createUser },
}));

mock.module('../../config/redis', () => ({ redis: createFakeRedis() }));

const { authServices } = await import('./auth.service');
const {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import('../../utils/jwt');
const { redisService } = await import('../../utils/redis');
const { hashPassword } = await import('../../utils/password');

beforeEach(() => {
  resetFakeRedis();
  findUserByEmail.mockClear();
  findUserById.mockClear();
  createUser.mockClear();
});

const countRefreshSessions = () =>
  [...fakeRedisStore.keys()].filter((key) =>
    key.startsWith('refresh-token:'),
  );

describe('authServices.register', () => {
  it('creates a user with a hashed password', async () => {
    const createdUser = { id: 'user-1', name: 'John', email: 'john@test.com' };
    createUser.mockImplementation(async () => createdUser);

    const user = await authServices.register(
      'John',
      'john@test.com',
      'password123',
    );

    expect(user).toEqual(createdUser as any);

    const [name, email, password] = createUser.mock.calls[0];
    expect(name).toBe('John');
    expect(email).toBe('john@test.com');
    expect(password).not.toBe('password123');
  });

  it('throws when the email is already registered', async () => {
    findUserByEmail.mockImplementation(async () => ({ id: 'user-1' }));

    expect(
      authServices.register('John', 'john@test.com', 'password123'),
    ).rejects.toThrow('User already exists');
  });
});

describe('authServices.login', () => {
  it('logs in with valid credentials and stores a refresh session in Redis', async () => {
    const hashed = await hashPassword('password123');
    findUserByEmail.mockImplementation(async () => ({
      id: 'user-1',
      name: 'John',
      email: 'john@test.com',
      password: hashed,
    }));

    const result = await authServices.login('john@test.com', 'password123');

    expect(result.user.id).toBe('user-1');

    const { payload } = await verifyAccessToken(result.accessToken);
    expect(payload.sub).toBe('user-1');

    // Exactly one refresh-token session stored, owned by the user
    const sessionKeys = countRefreshSessions();
    expect(sessionKeys).toHaveLength(1);
    expect(fakeRedisStore.get(sessionKeys[0])?.value).toBe('user-1');
  });

  it('throws when the email is not found', async () => {
    findUserByEmail.mockImplementation(async () => undefined);

    expect(
      authServices.login('ghost@test.com', 'password123'),
    ).rejects.toThrow('Email not found');
  });

  it('throws when the password is invalid', async () => {
    const hashed = await hashPassword('password123');
    findUserByEmail.mockImplementation(async () => ({
      id: 'user-1',
      name: 'John',
      email: 'john@test.com',
      password: hashed,
    }));

    expect(
      authServices.login('john@test.com', 'wrong-password'),
    ).rejects.toThrow('Invalid password');
  });
});

describe('authServices.refresh', () => {
  it('rotates the refresh token and returns a new token pair', async () => {
    findUserById.mockImplementation(async () => ({
      id: 'user-1',
      name: 'John',
      email: 'john@test.com',
    }));

    const { token, jti } = await createRefreshToken('user-1');
    await redisService.storeRefreshToken(jti, 'user-1', 60);

    const result = await authServices.refresh(token);

    // Old session removed, exactly one new session for the user
    const sessionKeys = countRefreshSessions();
    expect(sessionKeys).toHaveLength(1);
    expect(sessionKeys[0]).not.toBe(`refresh-token:${jti}`);
    expect(fakeRedisStore.get(sessionKeys[0])?.value).toBe('user-1');

    const { payload } = await verifyRefreshToken(result.refreshToken);
    expect(payload.jti).toBe(sessionKeys[0].replace('refresh-token:', ''));
  });

  it('throws when the refresh token was revoked (not in Redis)', async () => {
    const { token } = await createRefreshToken('user-1');

    expect(authServices.refresh(token)).rejects.toThrow(
      'Refresh token revoked or expired',
    );
  });

  it('throws when the stored session belongs to another user', async () => {
    const { token, jti } = await createRefreshToken('user-1');
    await redisService.storeRefreshToken(jti, 'user-2', 60);

    expect(authServices.refresh(token)).rejects.toThrow(
      'Refresh token revoked or expired',
    );
  });

  it('throws for an invalid refresh token', async () => {
    expect(authServices.refresh('not-a-jwt')).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('throws when an access token is used as a refresh token', async () => {
    const { token } = await createAccessToken('user-1');

    expect(authServices.refresh(token)).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('throws when the session owner no longer exists', async () => {
    const { token, jti } = await createRefreshToken('user-gone');
    await redisService.storeRefreshToken(jti, 'user-gone', 60);
    findUserById.mockImplementation(async () => undefined);

    expect(authServices.refresh(token)).rejects.toThrow('User not found');
  });
});

describe('authServices.logout', () => {
  it('revokes the refresh token and blacklists the access token', async () => {
    const access = await createAccessToken('user-1');
    const refresh = await createRefreshToken('user-1');
    await redisService.storeRefreshToken(refresh.jti, 'user-1', 60);

    await authServices.logout(
      'user-1',
      access.jti,
      access.expiresAt,
      refresh.token,
    );

    expect(await redisService.getRefreshToken(refresh.jti)).toBeNull();

    // Blacklisted only until the access token expires
    const blacklistEntry = fakeRedisStore.get(`blacklist:${access.jti}`);
    expect(blacklistEntry).toBeDefined();
    expect(blacklistEntry!.expiresAt! - Date.now()).toBeGreaterThan(0);
    expect(blacklistEntry!.expiresAt! - Date.now()).toBeLessThanOrEqual(
      15 * 60 * 1000,
    );
  });

  it('still blacklists the access token when no refresh token is provided', async () => {
    const access = await createAccessToken('user-1');

    await authServices.logout('user-1', access.jti, access.expiresAt);

    expect(fakeRedisStore.has(`blacklist:${access.jti}`)).toBe(true);
  });

  it('ignores an invalid refresh token on logout', async () => {
    const access = await createAccessToken('user-1');

    await authServices.logout(
      'user-1',
      access.jti,
      access.expiresAt,
      'not-a-jwt',
    );

    expect(fakeRedisStore.has(`blacklist:${access.jti}`)).toBe(true);
  });
});

