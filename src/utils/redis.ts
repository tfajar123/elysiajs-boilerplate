import { redis } from '../config/redis';

/**
 * Redis helpers untuk session / token management pada modul auth.
 *
 * Key patterns:
 * - refresh-token:{jti}  -> userId (whitelist refresh token, TTL = masa berlaku token)
 * - blacklist:{jti}      -> '1' (access token yang di-revoke, TTL = sisa umur token)
 */

const REFRESH_TOKEN_PREFIX = 'refresh-token:';
const BLACKLIST_PREFIX = 'blacklist:';

/** "15m" | "7d" | "1h" -> detik */
export const parseExpiryToSeconds = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60; // fallback 1 jam

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
  /** Simpan refresh token (whitelist) berdasarkan jti dengan TTL otomatis */
  async storeRefreshToken(jti: string, userId: string, ttlSeconds: number) {
    await redis.set(REFRESH_TOKEN_PREFIX + jti, userId, 'EX', ttlSeconds);
  },

  /** Ambil userId pemilik refresh token, null jika tidak ada / sudah expired */
  async getRefreshToken(jti: string): Promise<string | null> {
    return redis.get(REFRESH_TOKEN_PREFIX + jti);
  },

  /** Hapus refresh token (dipakai saat logout / rotasi token) */
  async deleteRefreshToken(jti: string) {
    await redis.del(REFRESH_TOKEN_PREFIX + jti);
  },

  /**
   * Blacklist access token sampai masa berlakunya habis,
   * sehingga token tidak bisa dipakai lagi meski belum expired.
   */
  async blacklistAccessToken(jti: string, ttlSeconds: number) {
    if (ttlSeconds <= 0) return; // token sudah expired, tidak perlu blacklist
    await redis.set(BLACKLIST_PREFIX + jti, '1', 'EX', ttlSeconds);
  },

  /** Cek apakah access token jti sudah di-revoke (logout) */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await redis.get(BLACKLIST_PREFIX + jti);
    return result === '1';
  },
};
