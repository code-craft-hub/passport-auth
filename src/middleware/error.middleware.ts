
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Operational error (expected)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Programming or unknown error
  res.status(500).json({
    status: 'error',
    message: env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
};