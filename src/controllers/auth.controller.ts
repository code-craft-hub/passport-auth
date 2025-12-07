import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { RegisterRequest, LoginRequest, ApiResponse } from '../types';

export class AuthController {
  async register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<{}, {}, LoginRequest>,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      // Note: Actual login is handled by Firebase client SDK
      // This endpoint is for custom logic if needed
      const { email } = req.body;

      res.status(200).json({
        success: true,
        message: 'Use Firebase client SDK to complete authentication',
        data: { email },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    _req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      // Client should delete the token
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();