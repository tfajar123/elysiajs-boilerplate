/**
 * Shared in-memory fake used to mock the Redis connection (`src/config/redis.ts`)
 * in unit tests. Every test file registers its own `mock.module` factory, but
 * all fakes share this same store, so the active mock is behaviorally
 * identical no matter which registration wins.
 */

interface FakeRedisEntry {
  value: string;
  expiresAt: number | null;
}

export const fakeRedisStore = new Map<string, FakeRedisEntry>();

export const resetFakeRedis = () => fakeRedisStore.clear();

export const createFakeRedis = () => ({
  async get(key: string): Promise<string | null> {
    const entry = fakeRedisStore.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      fakeRedisStore.delete(key);
      return null;
    }

    return entry.value;
  },

  /**
   * Mimics `SET key value EX seconds`.
   * A non-positive TTL is treated as "never stored" (already expired).
   */
  async set(
    key: string,
    value: string,
    _mode?: string,
    ttlSeconds?: number,
  ): Promise<string> {
    if (ttlSeconds !== undefined && ttlSeconds <= 0) return 'OK';

    fakeRedisStore.set(key, {
      value,
      expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null,
    });
    return 'OK';
  },

  async del(key: string): Promise<number> {
    return fakeRedisStore.delete(key) ? 1 : 0;
  },
});
