import { db } from '../db/connection';
import { Request, Response } from 'express';

export class HealthController {
  /**
   * @route   GET /api/health
   * @desc    Health check endpoint
   * @access  Public
   */
  static async check(_req: Request, res: Response) {
    try {
      // Check database connection
      await db.execute('SELECT 1');

      res.status(200).json({
        status: 'success',
        message: 'Service is healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Service is unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
