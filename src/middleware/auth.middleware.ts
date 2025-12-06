
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { JWTPayload } from '../types/auth.types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User extends JWTPayload {}
  }
}

/**
 * Authenticate JWT token
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: any, user: JWTPayload | false, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      req.user = user;
      next();
    }
  )(req, res, next);
};

/**
 * Authorize user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError('You do not have permission to access this resource')
      );
    }

    next();
  };
};

/**
 * Optional authentication (for public routes that benefit from user context)
 */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: any, user: JWTPayload | false) => {
      if (user) {
        req.user = user;
      }
      next();
    }
  )(req, res, next);
};
