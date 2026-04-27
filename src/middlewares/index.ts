import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token.' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired.' });
    return;
  }
  if (err.code === '23505') {
    res.status(409).json({ success: false, message: 'Resource already exists.' });
    return;
  }
  if (err.code === '23503') {
    res.status(400).json({ success: false, message: 'Referenced resource not found.' });
    return;
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error.'
      : err.message ?? 'Internal server error.';

  res.status(status).json({ success: false, message });
};


export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
  });
};

export { validate } from './validate.middleware';
export { publicApiLimiter, authLimiter, uploadLimiter } from './rateLimiter.middleware';
export { cacheMiddleware, cacheAside, invalidateCache, liveContentCacheKey } from './cache.middleware';
export { upload, handleUploadError } from './upload.middleware';
export { authenticate, authorize } from './auth.middleware';
