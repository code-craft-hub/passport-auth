import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { RegisterDTO, LoginDTO, RefreshTokenDTO } from '../types/auth.types';
// import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register new user
   * @access  Public
   */
  static async register(
    req: Request<{}, {}, RegisterDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await AuthService.register(req.body, req);

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/login
   * @desc    Login user
   * @access  Public
   */
  static async login(
    req: Request<{}, {}, LoginDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await AuthService.login(req.body, req);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/refresh
   * @desc    Refresh access token
   * @access  Public
   */
  static async refresh(
    req: Request<{}, {}, RefreshTokenDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await AuthService.refreshAccessToken(
        req.body.refreshToken,
        req
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout user (revoke refresh token)
   * @access  Private
   */
  static async logout(
    req: Request<{}, {}, RefreshTokenDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      await AuthService.logout(req.body.refreshToken, req.user!.userId);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/logout-all
   * @desc    Logout from all devices
   * @access  Private
   */
  static async logoutAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await AuthService.logoutAll(req.user!.userId);

      res.status(200).json({
        status: 'success',
        message: 'Logged out from all devices',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/auth/me
   * @desc    Get current user
   * @access  Private
   */
  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await UserService.findById(req.user!.userId);

      if (!user) {
         res.status(404).json({
          status: 'error',
          message: 'User not found',
        });return
      }

      res.status(200).json({
        status: 'success',
        data: UserService.toUserResponse(user),
      });
    } catch (error) {
      next(error);
    }
  }

//   /**
//    * @route   GET /api/auth/google
//    * @desc    Initiate Google OAuth flow
//    * @access  Public
//    */
//   static googleAuth(req: Request, res: Response, next: NextFunction) {
//     // Handled by Passport
//   }

  /**
   * @route   GET /api/auth/google/callback
   * @desc    Google OAuth callback
   * @access  Public
   */
  static async googleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // User data from Passport strategy
      const profile = req.user as any;

      const result = await AuthService.oauthLogin(profile, req);

      // Redirect to frontend with tokens (in production, use secure cookie or redirect)
      const redirectUrl = `${env.CORS_ORIGIN}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }
}
