
import { TokenService } from './token.service';
import { AuditService } from './audit.service';
import { RegisterDTO, LoginDTO, AuthResponse, JWTPayload } from '../types/auth.types';
import { UnauthorizedError } from '../utils/errors';
import { Request } from 'express';
import { logger } from '../utils/logger';
import { UserService } from './user.service';

export class AuthService {
  /**
   * Register new user
   */
  static async register(
    data: RegisterDTO,
    request: Request
  ): Promise<AuthResponse> {
    // Create user
    const user = await UserService.createUser(data);

    // Generate tokens
    const tokenPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'moderator',
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = TokenService.generateRefreshToken(tokenPayload);

    // Store refresh token
    const deviceInfo = `${request.get('user-agent')} - ${request.ip}`;
    await TokenService.storeRefreshToken(user.id, refreshToken, deviceInfo);

    // Audit log
    await AuditService.logAction({
      userId: user.id,
      action: 'USER_REGISTERED',
      request,
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Login user
   */
  static async login(
    data: LoginDTO,
    request: Request
  ): Promise<AuthResponse> {
    // Verify credentials
    const user = await UserService.verifyCredentials(data.email, data.password);

    // Update last login
    await UserService.updateLastLogin(user.id);

    // Generate tokens
    const tokenPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'moderator',
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = TokenService.generateRefreshToken(tokenPayload);

    // Store refresh token
    const deviceInfo = `${request.get('user-agent')} - ${request.ip}`;
    await TokenService.storeRefreshToken(user.id, refreshToken, deviceInfo);

    // Audit log
    await AuditService.logAction({
      userId: user.id,
      action: 'USER_LOGIN',
      request,
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * OAuth login/register
   */
  static async oauthLogin(
    profile: {
      provider: 'google';
      providerId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      accessToken: string;
      refreshToken?: string;
    },
    request: Request
  ): Promise<AuthResponse> {
    // Find or create user
    const user = await UserService.findOrCreateOAuthUser(profile);

    // Update last login
    await UserService.updateLastLogin(user.id);

    // Generate tokens
    const tokenPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'moderator',
    };

    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const refreshToken = TokenService.generateRefreshToken(tokenPayload);

    // Store refresh token
    const deviceInfo = `${request.get('user-agent')} - ${request.ip}`;
    await TokenService.storeRefreshToken(user.id, refreshToken, deviceInfo);

    // Audit log
    await AuditService.logAction({
      userId: user.id,
      action: 'USER_OAUTH_LOGIN',
      request,
      metadata: { provider: profile.provider },
    });

    logger.info('User OAuth login', { userId: user.id, provider: profile.provider });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    refreshToken: string,
    request: Request
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = TokenService.verifyRefreshToken(refreshToken);

    // Validate token in database
    const isValid = await TokenService.validateRefreshToken(refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Invalid or revoked refresh token');
    }

    // Get user to ensure still active
    const user = await UserService.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Revoke old refresh token (Token Rotation)
    await TokenService.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const tokenPayload: Omit<JWTPayload, 'tokenType'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'moderator',
    };

    const newAccessToken = TokenService.generateAccessToken(tokenPayload);
    const newRefreshToken = TokenService.generateRefreshToken(tokenPayload);

    // Store new refresh token
    const deviceInfo = `${request.get('user-agent')} - ${request.ip}`;
    await TokenService.storeRefreshToken(user.id, newRefreshToken, deviceInfo);

    // Audit log
    await AuditService.logAction({
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      request,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  static async logout(refreshToken: string, userId: string): Promise<void> {
    await TokenService.revokeRefreshToken(refreshToken);

    await AuditService.logAction({
      userId,
      action: 'USER_LOGOUT',
    });

    logger.info('User logged out', { userId });
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<void> {
    await TokenService.revokeAllUserTokens(userId);

    await AuditService.logAction({
      userId,
      action: 'USER_LOGOUT_ALL',
    });

    logger.info('User logged out from all devices', { userId });
  }
}