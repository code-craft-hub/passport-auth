import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JWTPayload } from '../types/auth.types';
import { db } from '../db/connection';
import { refreshTokens } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { UnauthorizedError } from '../utils/errors';

export class TokenService {
  /**
   * Generate JWT access token
   * Short-lived, contains user claims
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'tokenType'>): string {
    return (jwt as any).sign(
      { ...payload, tokenType: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY, issuer: 'auth-service', audience: 'api' }
    );
  }

  /**
   * Generate JWT refresh token
   * Long-lived, used to obtain new access tokens
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'tokenType'>): string {
    return (jwt as any).sign(
      { ...payload, tokenType: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY, issuer: 'auth-service', audience: 'api' }
    );
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: 'auth-service',
        audience: 'api',
      }) as JWTPayload;

      if (payload.tokenType !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: 'auth-service',
        audience: 'api',
      }) as JWTPayload;

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Store refresh token in database (Token Rotation Pattern)
   */
  static async storeRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string
  ): Promise<void> {
    const payload = this.verifyRefreshToken(token);
    const expiresAt = new Date(payload.exp! * 1000);

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
      deviceInfo,
    });
  }

  /**
   * Validate refresh token exists and is not revoked
   */
  static async validateRefreshToken(token: string): Promise<boolean> {
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .limit(1);

    return !!storedToken;
  }

  /**
   * Revoke refresh token (Logout)
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, token));
  }

  /**
   * Revoke all user tokens (Logout from all devices)
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  /**
   * Clean up expired tokens (Scheduled job)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }

  /**
   * Generate secure random token (for email verification, password reset)
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}