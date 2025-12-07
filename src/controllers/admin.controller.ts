import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../types';
import { BadRequestError } from '../utils/errors';

export class AdminController {
  async revokeUserSession(
    req: Request<{ userId: string }>,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      await authService.revokeUserSessions(userId);

      res.status(200).json({
        success: true,
        message: 'User sessions revoked successfully. User will be forced to re-authenticate.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();