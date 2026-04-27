import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

interface RateLimitOptions {
  windowSeconds: number;   // time window in seconds
  max: number;             // max requests per window
  keyPrefix: string;       // Redis key prefix
  message?: string;
}

/**
 * Redis sliding-window rate limiter.
 * Uses a Redis Sorted Set (ZSET) per IP per prefix.
 * Each request adds the current timestamp as a score.
 * Requests older than the window are pruned before counting.
 */
const createRedisRateLimiter = (opts: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace(/::ffff:/, '');
    const key = `ratelimit:${opts.keyPrefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - opts.windowSeconds * 1000;

    try {
      const pipeline = redis.pipeline();

      // Remove timestamps outside the current window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcard(key);

      // Add current request timestamp
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set TTL to clean up idle keys
      pipeline.expire(key, opts.windowSeconds);

      const results = await pipeline.exec();

      // zcard result is at index 1
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', opts.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max - currentCount - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + opts.windowSeconds * 1000) / 1000));

      if (currentCount >= opts.max) {
        res.status(429).json({
          success: false,
          message: opts.message ?? 'Too many requests. Please try again later.',
        });
        return;
      }

      next();
    } catch (err) {
      // If Redis is down, fail open (don't block requests)
      console.error('Rate limiter Redis error:', (err as Error).message);
      next();
    }
  };
};


/** Public /content/live — 60 requests per minute per IP */
export const publicApiLimiter = createRedisRateLimiter({
  windowSeconds: 60,
  max: 60,
  keyPrefix: 'public',
  message: 'Too many requests to the live endpoint. Please slow down.',
});

/** Auth routes — 20 attempts per 15 minutes per IP */
export const authLimiter = createRedisRateLimiter({
  windowSeconds: 15 * 60,
  max: 20,
  keyPrefix: 'auth',
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

/** Upload — 30 uploads per hour per IP */
export const uploadLimiter = createRedisRateLimiter({
  windowSeconds: 60 * 60,
  max: 30,
  keyPrefix: 'upload',
  message: 'Upload limit reached. Please try again in an hour.',
});
