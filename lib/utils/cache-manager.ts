type CacheKey = string;
type Millis = number;

class MemoryCache {
  private store = new Map<CacheKey, { value: unknown; expiresAt: number | null }>();

  get<T = unknown>(key: CacheKey): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt !== null && Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set<T = unknown>(key: CacheKey, value: T, ttl?: Millis) {
    const expiresAt = typeof ttl === 'number' ? Date.now() + ttl : null;
    this.store.set(key, { value, expiresAt });
  }

  del(key: CacheKey) {
    this.store.delete(key);
  }
}

export const cache = new MemoryCache();

export async function withCache<T>(
  key: string,
  compute: () => Promise<T> | T,
  ttl?: Millis
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const val = await compute();
  cache.set(key, val, ttl);
  return val;
}

const defaultExport = {
  get: cache.get.bind(cache),
  set: cache.set.bind(cache),
  del: cache.del.bind(cache),
  withCache,
};
export default defaultExport;
