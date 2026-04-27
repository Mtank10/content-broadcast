import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';


export const validate =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: err.issues.map((issue) => ({
            field: issue.path
              .filter((p): p is string | number => p !== 'body' && p !== 'query' && p !== 'params')
              .join('.'),
            message: issue.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
