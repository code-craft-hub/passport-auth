import { eq } from 'drizzle-orm';
import { auditLogs } from '../db/schema';
import { Request } from 'express';
import { db } from '../db/connection';
import { logger } from '../utils/logger';

export class AuditService {
  /**
   * Log user action for security monitoring
   */
  static async logAction(params: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    request?: Request;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.request?.ip,
        userAgent: params.request?.get('user-agent'),
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      });

      logger.info('Audit log created', {
        action: params.action,
        userId: params.userId,
      });
    } catch (error) {
      logger.error('Failed to create audit log', { error, params });
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserLogs(userId: string, limit = 50) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(auditLogs.createdAt)
      .limit(limit);
  }
}