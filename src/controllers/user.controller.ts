import { UserService } from '../services/user.service';
import { AuditService } from '../services/audit.service';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class UserController {
  /**
   * @route   GET /api/users/:id
   * @desc    Get user by ID
   * @access  Private
   */
  static async getUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await UserService.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      res.status(200).json({
        status: 'success',
        data: UserService.toUserResponse(user),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/users/me/audit-logs
   * @desc    Get current user's audit logs
   * @access  Private
   */
  static async getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const logs = await AuditService.getUserLogs(req.user!.userId);

      res.status(200).json({
        status: 'success',
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/users/me
   * @desc    Deactivate current user account
   * @access  Private
   */
  static async deactivateAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await UserService.deactivateUser(req.user!.userId);
      await AuthService.logoutAll(req.user!.userId);

      res.status(200).json({
        status: 'success',
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
