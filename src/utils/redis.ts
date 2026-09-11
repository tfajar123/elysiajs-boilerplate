import { redis } from '../config/redis';

/**
 * Redis helpers for session / token management in the auth module.
 *
 * Key patterns:
 * - refresh-token:{jti}  -> userId (refresh token whitelist, TTL = token lifetime)
 * - blacklist:{jti}      -> '1' (revoked access token, TTL = remaining token lifetime)
 */

const REFRESH_TOKEN_PREFIX = 'refresh-token:';
const BLACKLIST_PREFIX = 'blacklist:';

/** "15m" | "7d" | "1h" -> seconds */
export const parseExpiryToSeconds = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60; // fallback: 1 hour

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };

  return value * multipliers[unit];
};

export const redisService = {
  /** Store a refresh token (whitelist) by jti with an automatic TTL */
  async storeRefreshToken(jti: string, userId: string, ttlSeconds: number) {
    await redis.set(REFRESH_TOKEN_PREFIX + jti, userId, 'EX', ttlSeconds);
  },

  /** Get the userId owning the refresh token, null if missing / expired */
  async getRefreshToken(jti: string): Promise<string | null> {
    return redis.get(REFRESH_TOKEN_PREFIX + jti);
  },

  /** Delete a refresh token (used on logout / token rotation) */
  async deleteRefreshToken(jti: string) {
    await redis.del(REFRESH_TOKEN_PREFIX + jti);
  },

  /**
   * Blacklist an access token until it expires,
   * so it can no longer be used even though it is not expired yet.
   */
  async blacklistAccessToken(jti: string, ttlSeconds: number) {
    if (ttlSeconds <= 0) return; // token already expired, no need to blacklist
    await redis.set(BLACKLIST_PREFIX + jti, '1', 'EX', ttlSeconds);
  },

  /** Check whether an access token jti has been revoked (logout) */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await redis.get(BLACKLIST_PREFIX + jti);
    return result === '1';
  },
};
