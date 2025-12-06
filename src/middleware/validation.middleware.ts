import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import { Request, Response, NextFunction } from 'express';

/**
 * Validate request body against Zod schema
 */
export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError(JSON.stringify(errors)));
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as any).query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError(JSON.stringify(errors)));
      }
      next(error);
    }
  };
};