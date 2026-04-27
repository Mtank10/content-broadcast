import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import type { AuthenticatedRequest } from '../types';

export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body as {
        name: string;
        email: string;
        password: string;
        role: 'principal' | 'teacher';
      };
      const result = await AuthService.register({ name, email, password, role });

      res.status(201).json({
        success: true,
        message: 'Registration successful.',
        data: { user: result.user, token: result.token },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await AuthService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: { user: result.user, token: result.token },
      });
    } catch (err) {
      next(err);
    }
  },

  me(req: Request, res: Response): void {
    res.json({
      success: true,
      data: { user: (req as AuthenticatedRequest).user },
    });
  },
};
