import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { isProduction } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        errors: err.errors,
      });
      return;
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle Firebase errors
  if ((err as any).code) {
    const firebaseError = err as any;
    let statusCode = 500;
    let message = 'Internal server error';

    switch (firebaseError.code) {
      case 'auth/email-already-exists':
        statusCode = 409;
        message = 'Email already in use';
        break;
      case 'auth/invalid-email':
        statusCode = 400;
        message = 'Invalid email address';
        break;
      case 'auth/invalid-password':
        statusCode = 400;
        message = 'Password must be at least 6 characters';
        break;
      case 'auth/user-not-found':
        statusCode = 404;
        message = 'User not found';
        break;
      case 'auth/wrong-password':
        statusCode = 401;
        message = 'Invalid credentials';
        break;
      case 'auth/id-token-expired':
        statusCode = 401;
        message = 'Token expired';
        break;
      case 'auth/id-token-revoked':
        statusCode = 401;
        message = 'Token has been revoked';
        break;
      default:
        message = isProduction ? 'Internal server error' : firebaseError.message;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
    });
    return;
  }

  // Handle unexpected errors
  const statusCode = 500;
  const message = isProduction ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export const notFoundHandler = (
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
};