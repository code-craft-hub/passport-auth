import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { env } from './env';
import { UserService } from '../services/user.service';
import { JWTPayload } from '../types/auth.types';
import { UnauthorizedError } from '../utils/errors';

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_ACCESS_SECRET,
  issuer: 'auth-service',
  audience: 'api',
};

passport.use(
  'jwt',
  new JwtStrategy(jwtOptions, async (payload: JWTPayload, done) => {
    try {
      // Verify token type
      if (payload.tokenType !== 'access') {
        return done(new UnauthorizedError('Invalid token type'), false);
      }

      // Find user
      const user = await UserService.findById(payload.userId);

      if (!user) {
        return done(new UnauthorizedError('User not found'), false);
      }

      if (!user.isActive) {
        return done(new UnauthorizedError('Account is deactivated'), false);
      }

      // Return user payload
      return done(null, {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenType: 'access',
      } as JWTPayload);
    } catch (error) {
      return done(error, false);
    }
  })
);
