import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limit reutilizable basado en Upstash Redis.
 * Ejemplo: await softRateLimit(`key`, 60, '10 m')
 */
export function makeRateLimiter(limit: number, window: string) {
  const redis = (() => {
    try {
      return Redis.fromEnv();
    } catch {
      return null;
    }
  })();

  const limiter = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window) })
    : null;

  return {
    async check(key: string): Promise<{ allowed: boolean }>
    {
      if (!limiter) return { allowed: true };
      const { success } = await limiter.limit(key);
      return { allowed: success };
    },
  };
}

export const Soft60per10m = makeRateLimiter(60, '10 m');
export const Strong20per10m = makeRateLimiter(20, '10 m');


