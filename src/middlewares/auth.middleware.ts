import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import type { SafeUser, UserRole, JwtPayload, AuthenticatedRequest } from '../types';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }

    const result = await pool.query<SafeUser>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows[0]) {
      res.status(401).json({ success: false, message: 'User no longer exists.' });
      return;
    }

    (req as AuthenticatedRequest).user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
};
