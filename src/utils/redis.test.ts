import { beforeEach, describe, expect, it, mock } from 'bun:test';

import {
  createFakeRedis,
  fakeRedisStore,
  resetFakeRedis,
} from '../test/fake-redis';

// Mock the raw Redis connection; utils/redis itself stays REAL.
mock.module('../config/redis', () => ({ redis: createFakeRedis() }));

const { parseExpiryToSeconds, redisService } = await import('./redis');

describe('parseExpiryToSeconds', () => {
  it('converts supported expiry formats to seconds', () => {
    expect(parseExpiryToSeconds('30s')).toBe(30);
    expect(parseExpiryToSeconds('15m')).toBe(900);
    expect(parseExpiryToSeconds('1h')).toBe(3600);
    expect(parseExpiryToSeconds('7d')).toBe(604800);
  });

  it('falls back to 1 hour for unsupported formats', () => {
    expect(parseExpiryToSeconds('2w')).toBe(3600);
    expect(parseExpiryToSeconds('')).toBe(3600);
  });
});

describe('redisService', () => {
  beforeEach(resetFakeRedis);

  it('stores and retrieves a refresh token by jti', async () => {
    await redisService.storeRefreshToken('jti-1', 'user-1', 60);

    expect(await redisService.getRefreshToken('jti-1')).toBe('user-1');
  });

  it('returns null for a missing refresh token', async () => {
    expect(await redisService.getRefreshToken('missing')).toBeNull();
  });

  it('stores refresh tokens with the documented key pattern and a TTL', async () => {
    await redisService.storeRefreshToken('jti-1', 'user-1', 60);

    const entry = fakeRedisStore.get('refresh-token:jti-1');
    expect(entry?.value).toBe('user-1');
    expect(entry?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('deletes a refresh token', async () => {
    await redisService.storeRefreshToken('jti-1', 'user-1', 60);

    await redisService.deleteRefreshToken('jti-1');

    expect(await redisService.getRefreshToken('jti-1')).toBeNull();
  });

  it('blacklists an access token and detects it', async () => {
    await redisService.blacklistAccessToken('jti-1', 60);

    expect(await redisService.isAccessTokenBlacklisted('jti-1')).toBe(true);
    expect(await redisService.isAccessTokenBlacklisted('other')).toBe(false);
  });

  it('skips blacklisting when the token is already expired', async () => {
    await redisService.blacklistAccessToken('jti-1', 0);

    expect(fakeRedisStore.has('blacklist:jti-1')).toBe(false);
    expect(await redisService.isAccessTokenBlacklisted('jti-1')).toBe(false);
  });

  it('treats an expired blacklist entry as not blacklisted', async () => {
    fakeRedisStore.set('blacklist:jti-1', {
      value: '1',
      expiresAt: Date.now() - 1000,
    });

    expect(await redisService.isAccessTokenBlacklisted('jti-1')).toBe(false);
  });
});
