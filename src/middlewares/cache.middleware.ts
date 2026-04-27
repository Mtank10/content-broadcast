import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

const DEFAULT_TTL = parseInt(process.env.REDIS_CACHE_TTL_SECONDS ?? '60', 10);


export const cacheAside = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL
): Promise<T> => {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error('Cache read error:', (err as Error).message);
  }

  const data = await fetchFn();

  try {
    if (data !== null && data !== undefined) {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    }
  } catch (err) {
    console.error('Cache write error:', (err as Error).message);
  }

  return data;
};


export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('Cache invalidation error:', (err as Error).message);
  }
};


export const cacheMiddleware =
  (ttlSeconds = DEFAULT_TTL) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }
    } catch (err) {
      console.error('Cache middleware read error:', (err as Error).message);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      res.setHeader('X-Cache', 'MISS');
      
      if (res.statusCode === 200) {
        redis
          .setex(key, ttlSeconds, JSON.stringify(body))
          .catch((err: Error) => console.error('Cache middleware write error:', err.message));
      }
      return originalJson(body);
    };

    next();
  };


export const liveContentCacheKey = (teacherId: string, subject?: string): string => {
  const subjectPart = subject ? `?subject=${subject.toLowerCase()}` : '';
  return `cache:/content/live/${teacherId}${subjectPart}`;
};
