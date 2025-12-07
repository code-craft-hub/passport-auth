import { Request, Response, NextFunction } from 'express';
import { referralService } from '../services/referral.service';
import { ApiResponse } from '../types';

export class ReferralController {
  async getStats(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const stats = await referralService.getReferralStats(req.user.uid);

      res.status(200).json({
        success: true,
        data: stats,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getCode(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const stats = await referralService.getReferralStats(req.user.uid);

      res.status(200).json({
        success: true,
        data: {
          referralCode: stats.referralCode,
        },
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const referralController = new ReferralController();