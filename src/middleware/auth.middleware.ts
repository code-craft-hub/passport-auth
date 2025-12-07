import {Request,  Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
)=> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify token
    const decodedToken = await authService.verifyToken(token);

    // Validate session (check if user was force logged out)
    const isSessionValid = await authService.validateUserSession(decodedToken);
    if (!isSessionValid) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    // Attach user to request
    req.user = decodedToken;

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    next(error);
  }
};

export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Check if user has admin custom claim
    if (!req.user.admin) {
      throw new UnauthorizedError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};